/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server, Socket } from 'socket.io';
import type { Firestore } from 'firebase-admin/firestore';
import { Filter } from 'bad-words';
import { StateManager } from '../core/StateManager';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../types/socketEvents';

/**
 * Refactored Socket Handlers with StateManager integration
 *
 * This class handles all socket.io events with improved:
 * - Type safety
 * - Atomic queue operations
 * - Better error handling
 * - Centralized state management
 */
export class SocketHandlers {
  private filter: Filter;

  constructor(
    private io: Server,
    private stateManager: StateManager,
    private getUserFromToken: (token: string) => Promise<any | null>,
    private firestore: Firestore | null
  ) {
    this.filter = new Filter();
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Resolve friend IDs for a user from Firestore.
   */
  private async getFriendIds(userId: string): Promise<string[]> {
    if (!this.firestore) return [];

    try {
      const userSnap = await this.firestore.collection('users').doc(userId).get();
      if (!userSnap.exists) return [];

      const userData = userSnap.data() as any;
      if (!Array.isArray(userData?.friends)) return [];

      return userData.friends.filter(
        (friendId: unknown): friendId is string => typeof friendId === 'string'
      );
    } catch (error) {
      console.error('[SocketHandlers] Failed to load friend ids for presence:', error);
      return [];
    }
  }

  /**
   * Notify all friends of userId about online/offline status.
   */
  private async notifyFriendsStatus(userId: string, isOnline: boolean): Promise<void> {
    const friendIds = await this.getFriendIds(userId);
    if (friendIds.length === 0) return;

    for (const friendId of friendIds) {
      const friendSockets = this.stateManager.getUserSockets(friendId);
      if (!friendSockets) continue;

      friendSockets.forEach((socketId) => {
        this.io.to(socketId).emit(SERVER_EVENTS.FRIEND_STATUS, { userId, isOnline });
      });
    }
  }

  /**
   * Send current online statuses of a user's friends to the given socket.
   */
  private async syncFriendStatusesForUser(userId: string, socketId: string): Promise<void> {
    const friendIds = await this.getFriendIds(userId);
    if (friendIds.length === 0) return;

    friendIds.forEach((friendId) => {
      this.io.to(socketId).emit(SERVER_EVENTS.FRIEND_STATUS, {
        userId: friendId,
        isOnline: this.stateManager.isUserOnline(friendId),
      });
    });
  }

  /**
   * Get chat ID from two user IDs
   */
  private getChatId(id1: string, id2: string): string {
    return [id1, id2].sort().join('_');
  }

  /**
   * Handle socket disconnection with proper cleanup
   */
  private async handleDisconnect(socketId: string): Promise<void> {
    try {
      // Remove from queue
      await this.stateManager.removeFromQueue(socketId);

      // Handle active chat cleanup
      const chat = this.stateManager.getChat(socketId);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_DISCONNECTED);
        this.stateManager.deleteChat(chat.partnerSocketId);
        this.stateManager.deleteChat(socketId);
      }
    } catch (error) {
      console.error('[SocketHandlers] Error in handleDisconnect:', error);
    }
  }

  // ============================================================================
  // Authentication Handler
  // ============================================================================

  setupAuthHandler(socket: Socket): void {
    socket.on(CLIENT_EVENTS.AUTHENTICATE, async (token: string | null) => {
      try {
        if (token) {
          const user = await this.getUserFromToken(token);
          if (user) {
            this.stateManager.setSocketUser(socket.id, user.id);
            const isNew = this.stateManager.addUserSocket(user.id, socket.id);

            if (isNew) {
              void this.notifyFriendsStatus(user.id, true);
            }
            void this.syncFriendStatusesForUser(user.id, socket.id);

            // Update queue entry if user authenticated after joining
            this.stateManager.updateQueueUserId(socket.id, user.id);

            // Update active chat partner info
            const myChat = this.stateManager.getChat(socket.id);
            if (myChat) {
              const partnerChat = this.stateManager.getChat(myChat.partnerSocketId);
              if (partnerChat) {
                partnerChat.partnerUserId = user.id;
                this.stateManager.setChat(myChat.partnerSocketId, partnerChat);
              }
              this.io.to(myChat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_AUTHENTICATED, user.id);
            }

            socket.emit(SERVER_EVENTS.AUTHENTICATED, {
              id: user.id,
              username: user.username,
              avatarColor: user.avatarColor,
            });

            console.log(`[SocketHandlers] User authenticated: ${user.username}`);
          }
        } else {
          // Logout case
          const userId = this.stateManager.getUserId(socket.id);
          if (userId) {
            const isOffline = this.stateManager.removeUserSocket(userId, socket.id);
            if (isOffline) {
              void this.notifyFriendsStatus(userId, false);
            }
            this.stateManager.deleteSocketUser(socket.id);

            // Update queue state
            this.stateManager.updateQueueUserId(socket.id, undefined);

            // Update active chat
            const myChat = this.stateManager.getChat(socket.id);
            if (myChat) {
              const partnerChat = this.stateManager.getChat(myChat.partnerSocketId);
              if (partnerChat) {
                partnerChat.partnerUserId = undefined;
                this.stateManager.setChat(myChat.partnerSocketId, partnerChat);
              }
              this.io.to(myChat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_AUTHENTICATED, null);
            }
          }
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in authenticate handler:', error);
      }
    });
  }

  // ============================================================================
  // Matching Handlers
  // ============================================================================

  setupMatchingHandlers(socket: Socket, sessionId: string): void {
    socket.on(CLIENT_EVENTS.JOIN_QUEUE, async () => {
      try {
        // Don't join if already in queue or chatting
        if (this.stateManager.isInQueue(socket.id) || this.stateManager.hasActiveChat(socket.id)) {
          return;
        }

        const userId = this.stateManager.getUserId(socket.id);

        // Try to find a match atomically
        const partner = await this.stateManager.findMatch(socket.id);

        if (partner) {
          // Found a match!
          const myUserId = this.stateManager.getUserId(socket.id) ?? userId;
          const partnerUserId = this.stateManager.getUserId(partner.socketId) ?? partner.userId;

          // Create chat sessions
          this.stateManager.setChat(socket.id, {
            partnerSocketId: partner.socketId,
            partnerSessionId: partner.sessionId,
            mediaConsent: false,
            partnerUserId,
          });

          this.stateManager.setChat(partner.socketId, {
            partnerSocketId: socket.id,
            partnerSessionId: sessionId,
            mediaConsent: false,
            partnerUserId: myUserId,
          });

          // Notify both users
          this.io.to(socket.id).emit(SERVER_EVENTS.MATCHED, { partnerUserId });
          this.io.to(partner.socketId).emit(SERVER_EVENTS.MATCHED, { partnerUserId: myUserId });

          console.log(`[SocketHandlers] Matched ${socket.id} with ${partner.socketId}`);
        } else {
          // No match found, add to queue
          await this.stateManager.addToQueue({ socketId: socket.id, sessionId, userId });
          socket.emit(SERVER_EVENTS.WAITING);
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in join-queue handler:', error);
        socket.emit(SERVER_EVENTS.WAITING);
      }
    });

    socket.on(CLIENT_EVENTS.LEAVE_CHAT, async () => {
      try {
        await this.handleDisconnect(socket.id);
      } catch (error) {
        console.error('[SocketHandlers] Error in leave-chat handler:', error);
      }
    });
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  setupMessageHandlers(socket: Socket): void {
    socket.on(CLIENT_EVENTS.SEND_MESSAGE, async (payload: any) => {
      try {
        const chat = this.stateManager.getChat(socket.id);
        if (!chat) return;

        const text = typeof payload === 'string' ? payload : payload.text || '';
        const image = typeof payload === 'object' ? payload.image : undefined;
        const video = typeof payload === 'object' ? payload.video : undefined;
        const maxViews = typeof payload === 'object' ? payload.maxViews : undefined;
        const messageId = payload.id || crypto.randomUUID();

        // Check permissions for media
        if (image || video) {
          const partnerChat = this.stateManager.getChat(chat.partnerSocketId);
          if (!chat.mediaConsent || !partnerChat?.mediaConsent) {
            return;
          }
        }

        // Clean text with bad-words filter
        let cleanText = text;
        try {
          if (text) cleanText = this.filter.clean(text);
        } catch (e) {
          // If filter fails, use original text
        }

        // Send message to partner
        this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.RECEIVE_MESSAGE, {
          id: messageId,
          text: cleanText,
          image,
          video,
          maxViews,
          viewCount: 0,
          sender: 'partner',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in send-message handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.MESSAGE_VIEWED, (payload: any) => {
      try {
        const messageId = typeof payload === 'string' ? payload : payload.messageId;
        const chat = this.stateManager.getChat(socket.id);

        if (chat) {
          this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_MESSAGE_VIEWED, messageId);
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in message-viewed handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.MESSAGE_REACTION, ({ messageId, emoji }: any) => {
      try {
        const chat = this.stateManager.getChat(socket.id);
        if (chat) {
          this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_MESSAGE_REACTION, {
            messageId,
            emoji,
          });
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in message-reaction handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.TYPING, (isTyping: boolean) => {
      try {
        const chat = this.stateManager.getChat(socket.id);
        if (chat) {
          this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_TYPING, isTyping);
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in typing handler:', error);
      }
    });
  }

  // ============================================================================
  // Media Permission Handlers
  // ============================================================================

  setupMediaHandlers(socket: Socket): void {
    socket.on(CLIENT_EVENTS.REQUEST_MEDIA_PERMISSION, () => {
      try {
        const chat = this.stateManager.getChat(socket.id);
        if (!chat) return;

        chat.mediaConsent = true;
        this.stateManager.setChat(socket.id, chat);

        const partnerChat = this.stateManager.getChat(chat.partnerSocketId);

        this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.PARTNER_REQUESTED_MEDIA);

        if (partnerChat && partnerChat.mediaConsent) {
          this.io.to(socket.id).emit(SERVER_EVENTS.MEDIA_PERMISSION_GRANTED);
          this.io.to(chat.partnerSocketId).emit(SERVER_EVENTS.MEDIA_PERMISSION_GRANTED);
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in request-media-permission handler:', error);
      }
    });
  }

  // ============================================================================
  // Game Handlers
  // ============================================================================

  setupGameHandlers(socket: Socket): void {
    const getTargetSocketIds = (toUserId?: string): string[] => {
      if (toUserId) {
        const targetSockets = this.stateManager.getUserSockets(toUserId);
        if (!targetSockets) return [];
        return Array.from(targetSockets).filter((sId) => sId !== socket.id);
      }

      const chat = this.stateManager.getChat(socket.id);
      return chat ? [chat.partnerSocketId] : [];
    };

    socket.on(CLIENT_EVENTS.GAME_INVITE, (payload: any) => {
      try {
        const gameType = typeof payload === 'string' ? payload : payload?.gameType;
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        if (!gameType) return;

        const targetSocketIds = getTargetSocketIds(toUserId);
        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.GAME_INVITED, gameType);
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in game-invite handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.GAME_ACCEPT, (payload: any) => {
      try {
        const gameType = typeof payload === 'string' ? payload : payload?.gameType;
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        if (!gameType) return;

        const targetSocketIds = getTargetSocketIds(toUserId);
        if (targetSocketIds.length === 0) return;

        const starterIsMe = Math.random() > 0.5;
        this.io.to(socket.id).emit(SERVER_EVENTS.GAME_STARTED, {
          gameType,
          starter: starterIsMe ? 'me' : 'partner',
        });

        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.GAME_STARTED, {
            gameType,
            starter: starterIsMe ? 'partner' : 'me',
          });
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in game-accept handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.GAME_MOVE, (payload: any) => {
      try {
        const move =
          typeof payload === 'object' && payload !== null && 'move' in payload
            ? payload.move
            : payload;
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        const targetSocketIds = getTargetSocketIds(toUserId);

        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.GAME_PARTNER_MOVE, move);
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in game-move handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.DOODLE_DRAW, (payload: any) => {
      try {
        const stroke =
          typeof payload === 'object' && payload !== null && 'stroke' in payload
            ? payload.stroke
            : payload;
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        if (!stroke) return;

        const targetSocketIds = getTargetSocketIds(toUserId);
        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.DOODLE_PARTNER_DRAW, stroke);
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in doodle-draw handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.DOODLE_CLEAR, (payload: any) => {
      try {
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        const targetSocketIds = getTargetSocketIds(toUserId);
        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.DOODLE_PARTNER_CLEAR);
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in doodle-clear handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.GAME_CANCEL, (payload: any) => {
      try {
        const toUserId = typeof payload === 'object' ? payload?.toUserId : undefined;
        const targetSocketIds = getTargetSocketIds(toUserId);
        targetSocketIds.forEach((targetSocketId) => {
          this.io.to(targetSocketId).emit(SERVER_EVENTS.GAME_CANCELLED);
        });
      } catch (error) {
        console.error('[SocketHandlers] Error in game-cancel handler:', error);
      }
    });
  }

  // ============================================================================
  // Friend Request Handlers
  // ============================================================================

  setupFriendRequestHandlers(socket: Socket): void {
    socket.on(
      CLIENT_EVENTS.RESOLVE_PARTNER_USER,
      (ack?: (payload: { partnerUserId: string | null }) => void) => {
        try {
          const chat = this.stateManager.getChat(socket.id);
          ack?.({ partnerUserId: chat?.partnerUserId ?? null });
        } catch (error) {
          console.error('[SocketHandlers] Error in resolve-partner-user handler:', error);
          ack?.({ partnerUserId: null });
        }
      }
    );

    socket.on(CLIENT_EVENTS.FRIEND_REQUEST_SENT, (partnerUserId: string) => {
      try {
        const myUserId = this.stateManager.getUserId(socket.id);
        if (!myUserId) return;

        const partnerSockets = this.stateManager.getUserSockets(partnerUserId);
        if (partnerSockets) {
          partnerSockets.forEach((sId) => {
            this.io.to(sId).emit(SERVER_EVENTS.NEW_FRIEND_REQUEST, { fromId: myUserId });
          });
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in friend-request-sent handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.FRIEND_REQUEST_ACCEPTED, (fromId: string) => {
      try {
        const myUserId = this.stateManager.getUserId(socket.id);
        if (!myUserId) return;

        const fromSockets = this.stateManager.getUserSockets(fromId);
        if (fromSockets) {
          fromSockets.forEach((sId) => {
            this.io.to(sId).emit(SERVER_EVENTS.FRIEND_REQUEST_ACCEPTED, myUserId);
          });
        }
      } catch (error) {
        console.error('[SocketHandlers] Error in friend-request-accepted handler:', error);
      }
    });

    socket.on(CLIENT_EVENTS.DECLINE_FRIEND_REQUEST, (fromId: string) => {
      try {
        const myUserId = this.stateManager.getUserId(socket.id);
        if (!myUserId) return;
        socket.emit(SERVER_EVENTS.FRIEND_REQUEST_DECLINED, fromId);
      } catch (error) {
        console.error('[SocketHandlers] Error in decline-friend-request handler:', error);
      }
    });
  }

  // ============================================================================
  // Presence Handlers
  // ============================================================================

  setupPresenceHandlers(socket: Socket): void {
    socket.on(CLIENT_EVENTS.REQUEST_FRIENDS_ONLINE_STATUS, (friendIds: unknown) => {
      try {
        if (!Array.isArray(friendIds)) return;

        const statuses: Record<string, boolean> = {};
        friendIds.forEach((friendId) => {
          if (typeof friendId !== 'string') return;
          statuses[friendId] = this.stateManager.isUserOnline(friendId);
        });

        socket.emit(SERVER_EVENTS.FRIENDS_ONLINE_SNAPSHOT, statuses);
      } catch (error) {
        console.error('[SocketHandlers] Error in request-friends-online-status handler:', error);
      }
    });
  }

  // ============================================================================
  // Disconnect Handler
  // ============================================================================

  setupDisconnectHandler(socket: Socket): void {
    socket.on('disconnect', async () => {
      try {
        const userId = this.stateManager.getUserId(socket.id);
        if (userId) {
          const isOffline = this.stateManager.removeUserSocket(userId, socket.id);
          if (isOffline) {
            void this.notifyFriendsStatus(userId, false);
          }
        }

        await this.handleDisconnect(socket.id);
        this.stateManager.cleanupSocket(socket.id);
        this.io.emit(SERVER_EVENTS.ONLINE_COUNT, this.io.engine.clientsCount);

        console.log(`[SocketHandlers] User disconnected: ${socket.id}`);
      } catch (error) {
        console.error('[SocketHandlers] Error in disconnect handler:', error);
      }
    });
  }

  // ============================================================================
  // Setup All Handlers
  // ============================================================================

  /**
   * Setup all socket handlers for a connection
   */
  setupAllHandlers(socket: Socket, sessionId: string): void {
    this.setupAuthHandler(socket);
    this.setupMatchingHandlers(socket, sessionId);
    this.setupMessageHandlers(socket);
    this.setupMediaHandlers(socket);
    this.setupGameHandlers(socket);
    this.setupFriendRequestHandlers(socket);
    this.setupPresenceHandlers(socket);
    this.setupDisconnectHandler(socket);
  }
}
