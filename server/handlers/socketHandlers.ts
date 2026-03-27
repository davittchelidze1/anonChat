/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server, Socket } from 'socket.io';
import { Filter } from 'bad-words';
import {
  activeChats,
  socketToSession,
  socketToUser,
  userToSockets,
  waitingQueue,
  replaceWaitingQueue,
  directMessages
} from '../state';
import { WaitingUser } from '../types';

export class SocketHandlers {
  private filter: Filter;

  constructor(
    private io: Server,
    private getUserFromToken: (token: string) => Promise<any | null>
  ) {
    this.filter = new Filter();
  }

  /**
   * Helper to notify friends about status change
   */
  private notifyFriendsStatus(userId: string, isOnline: boolean) {
    // Note: We need access to users map for friends list
    // For now, we skip this functionality until we refactor state management
    // Original implementation would iterate through user's friends and emit to their sockets
  }

  /**
   * Add a socket to a user's socket set
   */
  private addUserSocket(userId: string, socketId: string): boolean {
    let isNew = false;
    if (!userToSockets.has(userId)) {
      userToSockets.set(userId, new Set());
      isNew = true;
    }
    userToSockets.get(userId)!.add(socketId);
    return isNew;
  }

  /**
   * Remove a socket from a user's socket set
   */
  private removeUserSocket(userId: string, socketId: string): boolean {
    const sockets = userToSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        userToSockets.delete(userId);
        return true;
      }
    }
    return false;
  }

  /**
   * Get chat ID from two user IDs
   */
  private getChatId(id1: string, id2: string): string {
    return [id1, id2].sort().join('_');
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socketId: string) {
    replaceWaitingQueue(waitingQueue.filter(u => u.socketId !== socketId));
    const chat = activeChats.get(socketId);
    if (chat) {
      this.io.to(chat.partnerSocketId).emit('partner-disconnected');
      activeChats.delete(chat.partnerSocketId);
      activeChats.delete(socketId);
    }
  }

  /**
   * Setup authentication handler
   */
  setupAuthHandler(socket: Socket) {
    socket.on('authenticate', async (token) => {
      if (token) {
        const user = await this.getUserFromToken(token);
        if (user) {
          socketToUser.set(socket.id, user.id);
          const isNew = this.addUserSocket(user.id, socket.id);
          if (isNew) this.notifyFriendsStatus(user.id, true);

          // If user authenticated after joining the queue, update queued entry
          // so future matches carry partnerUserId correctly.
          const waitingEntry = waitingQueue.find((u) => u.socketId === socket.id);
          if (waitingEntry) {
            waitingEntry.userId = user.id;
          }

          // If in an active chat, update partner's record
          const myChat = activeChats.get(socket.id);
          if (myChat) {
            const partnerChat = activeChats.get(myChat.partnerSocketId);
            if (partnerChat) {
              partnerChat.partnerUserId = user.id;
            }
            this.io.to(myChat.partnerSocketId).emit('partner-authenticated', user.id);
          }

          socket.emit('authenticated', { id: user.id, username: user.username, avatarColor: user.avatarColor });
          console.log('User authenticated via event:', user.username);
        }
      } else {
        // Logout case
        const userId = socketToUser.get(socket.id);
        if (userId) {
          const isOffline = this.removeUserSocket(userId, socket.id);
          if (isOffline) this.notifyFriendsStatus(userId, false);
          socketToUser.delete(socket.id);

          // Keep queue state consistent after logout.
          const waitingEntry = waitingQueue.find((u) => u.socketId === socket.id);
          if (waitingEntry) {
            waitingEntry.userId = undefined;
          }

          const myChat = activeChats.get(socket.id);
          if (myChat) {
            const partnerChat = activeChats.get(myChat.partnerSocketId);
            if (partnerChat) {
              partnerChat.partnerUserId = undefined;
            }
            this.io.to(myChat.partnerSocketId).emit('partner-authenticated', null);
          }
        }
      }
    });
  }

  /**
   * Setup queue and matching handlers
   */
  setupMatchingHandlers(socket: Socket, sessionId: string) {
    socket.on('join-queue', () => {
      if (waitingQueue.some(u => u.socketId === socket.id) || activeChats.has(socket.id)) return;

      const userId = socketToUser.get(socket.id);

      // Find a compatible partner
      let partnerIndex = -1;
      for (let i = 0; i < waitingQueue.length; i++) {
        partnerIndex = i;
        break;
      }

      if (partnerIndex !== -1) {
        const partner = waitingQueue.splice(partnerIndex, 1)[0];

        activeChats.set(socket.id, {
          partnerSocketId: partner.socketId,
          partnerSessionId: partner.sessionId,
          mediaConsent: false,
          partnerUserId: partner.userId
        });
        activeChats.set(partner.socketId, {
          partnerSocketId: socket.id,
          partnerSessionId: sessionId,
          mediaConsent: false,
          partnerUserId: userId
        });

        this.io.to(socket.id).emit('matched', { partnerUserId: partner.userId });
        this.io.to(partner.socketId).emit('matched', { partnerUserId: userId });
        console.log(`Matched ${socket.id} with ${partner.socketId}`);
      } else {
        waitingQueue.push({ socketId: socket.id, sessionId, userId });
        socket.emit('waiting');
      }
    });

    socket.on('leave-chat', () => {
      this.handleDisconnect(socket.id);
    });
  }

  /**
   * Setup messaging handlers
   */
  setupMessageHandlers(socket: Socket) {
    socket.on('send-message', (payload) => {
      const chat = activeChats.get(socket.id);
      if (!chat) return;

      const text = typeof payload === 'string' ? payload : payload.text || '';
      const image = typeof payload === 'object' ? payload.image : undefined;
      const video = typeof payload === 'object' ? payload.video : undefined;
      const maxViews = typeof payload === 'object' ? payload.maxViews : undefined;
      const messageId = payload.id || Math.random().toString(36).substring(2, 15);

      // Check permissions for media
      if (image || video) {
        const partnerChat = activeChats.get(chat.partnerSocketId);
        if (!chat.mediaConsent || !partnerChat?.mediaConsent) {
          return;
        }
      }

      let cleanText = text;
      try {
        if (text) cleanText = this.filter.clean(text);
      } catch (e) {
        // If filter fails, use original text
      }

      this.io.to(chat.partnerSocketId).emit('receive-message', {
        id: messageId,
        text: cleanText,
        image: image,
        video: video,
        maxViews: maxViews,
        viewCount: 0,
        sender: 'partner',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('message-viewed', (payload) => {
      const messageId = typeof payload === 'string' ? payload : payload.messageId;
      const partnerId = typeof payload === 'object' ? payload.partnerId : null;

      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('partner-message-viewed', messageId);
      }
    });

    socket.on('message-reaction', ({ messageId, emoji }) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('partner-message-reaction', { messageId, emoji });
      }
    });

    socket.on('typing', (isTyping) => {
      const chat = activeChats.get(socket.id);
      if (chat) this.io.to(chat.partnerSocketId).emit('partner-typing', isTyping);
    });
  }

  /**
   * Setup media permission handlers
   */
  setupMediaHandlers(socket: Socket) {
    socket.on('request-media-permission', () => {
      const chat = activeChats.get(socket.id);
      if (!chat) return;

      chat.mediaConsent = true;
      const partnerChat = activeChats.get(chat.partnerSocketId);

      this.io.to(chat.partnerSocketId).emit('partner-requested-media');

      if (partnerChat && partnerChat.mediaConsent) {
        this.io.to(socket.id).emit('media-permission-granted');
        this.io.to(chat.partnerSocketId).emit('media-permission-granted');
      }
    });
  }

  /**
   * Setup game handlers
   */
  setupGameHandlers(socket: Socket) {
    socket.on('game-invite', (gameType) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('game-invited', gameType);
      }
    });

    socket.on('game-accept', (gameType) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        const starter = Math.random() > 0.5 ? socket.id : chat.partnerSocketId;
        this.io.to(socket.id).emit('game-started', { gameType, starter: starter === socket.id ? 'me' : 'partner' });
        this.io.to(chat.partnerSocketId).emit('game-started', { gameType, starter: starter === chat.partnerSocketId ? 'me' : 'partner' });
      }
    });

    socket.on('game-move', (move) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('game-partner-move', move);
      }
    });

    socket.on('doodle-draw', (stroke) => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('doodle-partner-draw', stroke);
      }
    });

    socket.on('doodle-clear', () => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('doodle-partner-clear');
      }
    });

    socket.on('game-cancel', () => {
      const chat = activeChats.get(socket.id);
      if (chat) {
        this.io.to(chat.partnerSocketId).emit('game-cancelled');
      }
    });
  }

  /**
   * Setup friend request socket handlers
   */
  setupFriendRequestHandlers(socket: Socket) {
    socket.on('friend-request-sent', (partnerUserId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;

      const partnerSockets = userToSockets.get(partnerUserId);
      if (partnerSockets) {
        partnerSockets.forEach(sId => {
          this.io.to(sId).emit('new-friend-request', { fromId: myUserId });
        });
      }
    });

    socket.on('friend-request-accepted', (fromId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;

      const fromSockets = userToSockets.get(fromId);
      if (fromSockets) {
        fromSockets.forEach(sId => {
          this.io.to(sId).emit('friend-request-accepted', myUserId);
        });
      }
    });

    socket.on('decline-friend-request', (fromId) => {
      const myUserId = socketToUser.get(socket.id);
      if (!myUserId) return;
      socket.emit('friend-request-declined', fromId);
    });
  }

  /**
   * Setup disconnect handler
   */
  setupDisconnectHandler(socket: Socket) {
    socket.on('disconnect', () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const isOffline = this.removeUserSocket(userId, socket.id);
        if (isOffline) this.notifyFriendsStatus(userId, false);
        socketToUser.delete(socket.id);
      }
      this.handleDisconnect(socket.id);
      socketToSession.delete(socket.id);
      this.io.emit('online-count', this.io.engine.clientsCount);
    });
  }

  /**
   * Setup all socket handlers for a connection
   */
  setupAllHandlers(socket: Socket, sessionId: string) {
    this.setupAuthHandler(socket);
    this.setupMatchingHandlers(socket, sessionId);
    this.setupMessageHandlers(socket);
    this.setupMediaHandlers(socket);
    this.setupGameHandlers(socket);
    this.setupFriendRequestHandlers(socket);
    this.setupDisconnectHandler(socket);
  }
}
