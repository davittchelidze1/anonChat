/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Socket } from 'socket.io-client';
import { Message, GameType, Friend, GameState } from '../types';
import { SOCKET_EVENTS } from '../events';
import { createSystemMessage } from '../utils/helpers';
import { checkTicTacToeWinner, checkRPSWinner } from '../utils/helpers';

type Dispatch<T> = (value: T | ((prev: T) => T)) => void;

interface SocketHandlerDependencies {
  socket: Socket;
  setState: (state: any) => void;
  setMessages: Dispatch<Message[]>;
  setIsPartnerTyping: (typing: boolean) => void;
  setPartnerUserId: (userId: string | null) => void;
  setMediaAllowed: (allowed: boolean) => void;
  setMediaRequested: (requested: boolean) => void;
  setPartnerRequestedMedia: (requested: boolean) => void;
  setGameState: Dispatch<GameState | null>;
  setOnlineCount: (count: number) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setFriends: Dispatch<Friend[]>;
  setPendingFriendRequest: (req: { fromId: string; fromUsername: string } | null) => void;
  setPendingMessageNotification: (notif: { senderId: string; senderUsername: string; text: string } | null) => void;
  fetchFriends: () => void;
  showSystemNotification: (title: string, body: string) => void;
  handleStartDirectChat: (friend: Friend) => void;
  state: string;
  selectedFriend: Friend | null;
  friends: Friend[];
  partnerUserId: string | null;
}

/**
 * Setup connection event handlers
 */
export function setupConnectionHandlers(deps: SocketHandlerDependencies) {
  const { socket, state, selectedFriend, handleStartDirectChat, fetchFriends } = deps;

  socket.on(SOCKET_EVENTS.CONNECT, async () => {
    let tokenToSend: string | null = null;

    try {
      const { auth } = await import('../firebase');
      if (auth.currentUser) {
        tokenToSend = await auth.currentUser.getIdToken();
        localStorage.setItem('anon_chat_token', tokenToSend);
      }
    } catch (error) {
      console.error('Failed to fetch fresh auth token for socket:', error);
    }

    if (!tokenToSend) {
      tokenToSend = localStorage.getItem('anon_chat_token');
    }

    if (tokenToSend) {
      if (socket.auth) {
        (socket.auth as { token?: string }).token = tokenToSend;
      }
      socket.emit(SOCKET_EVENTS.AUTHENTICATE, tokenToSend);
    }

    fetchFriends();
    if (state === 'direct-chat' && selectedFriend) {
      handleStartDirectChat(selectedFriend);
    }
  });
}

/**
 * Setup matching event handlers
 */
export function setupMatchingHandlers(deps: SocketHandlerDependencies) {
  const { socket, setState, setPartnerUserId, setMessages } = deps;

  socket.on(SOCKET_EVENTS.WAITING, () => {
    setState('waiting');
  });

  socket.on(SOCKET_EVENTS.MATCHED, ({ partnerUserId }: { partnerUserId?: string }) => {
    setState('chatting');
    setPartnerUserId(partnerUserId || null);
    setMessages([createSystemMessage(
      'You are now chatting with a stranger. Say hi! (Double-tap or long-press a message to react)',
      'system-start'
    )]);
  });
}

/**
 * Setup message event handlers
 */
export function setupMessageHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, setIsPartnerTyping } = deps;

  socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  });

  socket.on(SOCKET_EVENTS.PARTNER_TYPING, (isTyping: boolean) => {
    setIsPartnerTyping(isTyping);
  });

  socket.on(SOCKET_EVENTS.PARTNER_MESSAGE_VIEWED, (messageId: string) => {
    // Placeholder for future "Seen" status feature
  });

  socket.on(SOCKET_EVENTS.PARTNER_MESSAGE_REACTION, ({ messageId, emoji }: { messageId: string, emoji: string }) => {
    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
  });
}

/**
 * Setup direct message event handlers
 */
export function setupDirectMessageHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, state, selectedFriend, friends, setPendingMessageNotification, showSystemNotification, fetchFriends } = deps;

  socket.on(SOCKET_EVENTS.RECEIVE_DIRECT_MESSAGE, (msg: Message & { senderId: string }) => {
    if (state === 'direct-chat' && selectedFriend?.id === msg.senderId) {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } else {
      const sender = friends.find(f => f.id === msg.senderId);
      const senderName = sender?.username || 'Someone';

      setPendingMessageNotification({
        senderId: msg.senderId,
        senderUsername: senderName,
        text: msg.text || 'Sent a media message'
      });

      showSystemNotification(`New message from ${senderName}`, msg.text || 'Sent a media message');
      fetchFriends();
    }
  });

  socket.on(SOCKET_EVENTS.DIRECT_MESSAGE_SENT, (msg: Message & { toId: string }) => {
    if (state === 'direct-chat' && selectedFriend?.id === msg.toId) {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
    fetchFriends();
  });
}

/**
 * Setup partner status event handlers
 */
export function setupPartnerStatusHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, setIsPartnerTyping, setMediaAllowed, setMediaRequested, setPartnerRequestedMedia, setGameState, setPartnerUserId } = deps;

  socket.on(SOCKET_EVENTS.PARTNER_DISCONNECTED, () => {
    setMessages((prev) => [...prev, createSystemMessage('Stranger has disconnected.', 'system-disc')]);
    setIsPartnerTyping(false);
    setMediaAllowed(false);
    setMediaRequested(false);
    setPartnerRequestedMedia(false);
    setGameState(null);
  });

  socket.on(SOCKET_EVENTS.PARTNER_AUTHENTICATED, (userId: string | null) => {
    setPartnerUserId(userId);
    if (userId) {
      setMessages((prev) => [...prev, createSystemMessage(
        'Stranger has logged in. You can now add them as a friend!',
        'system-partner-auth'
      )]);
    } else {
      setMessages((prev) => [...prev, createSystemMessage(
        'Stranger has logged out.',
        'system-partner-unauth'
      )]);
    }
  });
}

/**
 * Setup media sharing event handlers
 */
export function setupMediaHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, setMediaAllowed, setPartnerRequestedMedia } = deps;

  socket.on(SOCKET_EVENTS.PARTNER_REQUESTED_MEDIA, () => {
    setPartnerRequestedMedia(true);
    setMessages((prev) => [...prev, createSystemMessage(
      'Stranger wants to share photos/videos. Click the media icon to accept.',
      'system-media'
    )]);
  });

  socket.on(SOCKET_EVENTS.MEDIA_PERMISSION_GRANTED, () => {
    setMediaAllowed(true);
    setMessages((prev) => [...prev, createSystemMessage(
      'Media sharing enabled! You can now send photos and videos.',
      'system-granted'
    )]);
  });
}

/**
 * Setup game event handlers
 */
export function setupGameHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, setGameState } = deps;

  socket.on(SOCKET_EVENTS.GAME_INVITED, (gameType: GameType) => {
    setMessages((prev) => [...prev, createSystemMessage(
      `Stranger invited you to play ${gameType === 'tictactoe' ? 'Tic-Tac-Toe' : 'Rock Paper Scissors'}!`,
      'system-game'
    )]);
    setGameState({
      type: gameType,
      status: 'inviting',
      turn: 'partner'
    });
  });

  socket.on(SOCKET_EVENTS.GAME_STARTED, ({ gameType, starter }: { gameType: GameType, starter: 'me' | 'partner' }) => {
    setGameState({
      type: gameType,
      status: 'playing',
      turn: starter,
      board: gameType === 'tictactoe' ? Array(9).fill(null) : undefined,
      strokes: gameType === 'doodle' ? [] : undefined
    });
  });

  socket.on(SOCKET_EVENTS.GAME_PARTNER_MOVE, (move: number | string) => {
    setGameState((prev) => {
      if (!prev) return null;

      if (prev.type === 'tictactoe') {
        const newBoard = [...(prev.board || [])];
        newBoard[move as number] = 'O';

        const winner = checkTicTacToeWinner(newBoard);
        if (winner) {
          return {
            ...prev,
            board: newBoard,
            status: 'ended',
            winner: winner === 'O' ? 'partner' : (winner === 'draw' ? 'draw' : 'me')
          };
        }

        return { ...prev, board: newBoard, turn: 'me' };
      } else if (prev.type === 'rps') {
        if (prev.myMove) {
          const winner = checkRPSWinner(prev.myMove, move as string);
          return { ...prev, partnerMove: move as string, status: 'ended', winner };
        }
        return { ...prev, partnerMove: move as string };
      }
      return prev;
    });
  });

  socket.on(SOCKET_EVENTS.GAME_CANCELLED, () => {
    setGameState(null);
    setMessages((prev) => [...prev, createSystemMessage('Game was cancelled.', 'system-cancel')]);
  });

  socket.on(SOCKET_EVENTS.DOODLE_PARTNER_DRAW, (stroke: { x: number; y: number; color: string; isStart: boolean }) => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: [...(prev.strokes || []), stroke]
      };
    });
  });

  socket.on(SOCKET_EVENTS.DOODLE_PARTNER_CLEAR, () => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: []
      };
    });
  });
}

/**
 * Setup friend request event handlers
 */
export function setupFriendRequestHandlers(deps: SocketHandlerDependencies) {
  const { socket, setMessages, setIsAuthModalOpen, fetchFriends, setPendingFriendRequest, partnerUserId, selectedFriend } = deps;

  socket.on(SOCKET_EVENTS.AUTH_REQUIRED_FOR_FRIEND, () => {
    setIsAuthModalOpen(true);
    setMessages((prev) => [...prev, createSystemMessage(
      'You need to be logged in to add friends.',
      'system-auth'
    )]);
  });

  socket.on(SOCKET_EVENTS.PARTNER_NOT_LOGGED_IN, () => {
    setMessages((prev) => [...prev, createSystemMessage(
      'This stranger is not logged in and cannot be added as a friend.',
      'system-no-auth'
    )]);
  });

  socket.on(SOCKET_EVENTS.FRIEND_REQUEST_SENT, () => {
    setMessages((prev) => [...prev, createSystemMessage(
      'Friend request sent!',
      'system-fr-sent'
    )]);
  });

  socket.on(SOCKET_EVENTS.NEW_FRIEND_REQUEST, ({ fromId, fromUsername }: { fromId: string; fromUsername: string }) => {
    fetchFriends();
    if (partnerUserId !== fromId && selectedFriend?.id !== fromId) {
      setPendingFriendRequest({ fromId, fromUsername });
    }
    setMessages((prev) => [...prev, createSystemMessage(
      `${fromUsername} sent you a friend request!`,
      'system-fr-new'
    )]);
  });

  socket.on(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, () => {
    fetchFriends();
    setMessages((prev) => [...prev, createSystemMessage(
      'You are now friends!',
      'system-fr-acc'
    )]);
  });

  socket.on(SOCKET_EVENTS.FRIEND_REQUEST_DECLINED, () => {
    fetchFriends();
  });

  socket.on(SOCKET_EVENTS.ALREADY_FRIENDS, () => {
    setMessages((prev) => [...prev, createSystemMessage(
      'You are already friends with this user.',
      'system-fr-already'
    )]);
  });

  socket.on(SOCKET_EVENTS.REQUEST_ALREADY_SENT, () => {
    setMessages((prev) => [...prev, createSystemMessage(
      'You have already sent a friend request to this user.',
      'system-fr-already-sent'
    )]);
  });

  socket.on(SOCKET_EVENTS.CANNOT_ADD_SELF, () => {
    setMessages((prev) => [...prev, createSystemMessage(
      'You cannot add yourself as a friend.',
      'system-fr-self'
    )]);
  });
}

/**
 * Setup friend status event handlers
 */
export function setupFriendStatusHandlers(deps: SocketHandlerDependencies) {
  const { socket, setFriends } = deps;

  socket.on(SOCKET_EVENTS.FRIEND_STATUS, ({ userId, isOnline }: { userId: string, isOnline: boolean }) => {
    setFriends(prev => prev.map(f =>
      f.id === userId ? { ...f, isOnline } : f
    ));
  });

  socket.on(SOCKET_EVENTS.FRIENDS_ONLINE_SNAPSHOT, (statuses: Record<string, boolean>) => {
    setFriends((prev) => prev.map((friend) => {
      if (!(friend.id in statuses)) return friend;
      return { ...friend, isOnline: Boolean(statuses[friend.id]) };
    }));
  });
}

/**
 * Setup online count event handler
 */
export function setupOnlineCountHandler(deps: SocketHandlerDependencies) {
  const { socket, setOnlineCount } = deps;

  socket.on(SOCKET_EVENTS.ONLINE_COUNT, (count: number) => {
    setOnlineCount(count);
  });
}

/**
 * Setup all socket event handlers
 */
export function setupAllSocketHandlers(deps: SocketHandlerDependencies) {
  setupConnectionHandlers(deps);
  setupMatchingHandlers(deps);
  setupMessageHandlers(deps);
  setupDirectMessageHandlers(deps);
  setupPartnerStatusHandlers(deps);
  setupMediaHandlers(deps);
  setupGameHandlers(deps);
  setupFriendRequestHandlers(deps);
  setupFriendStatusHandlers(deps);
  setupOnlineCountHandler(deps);
}

/**
 * Cleanup all socket event handlers
 */
export function cleanupAllSocketHandlers(socket: Socket) {
  socket.off(SOCKET_EVENTS.CONNECT);
  socket.off(SOCKET_EVENTS.FRIEND_STATUS);
  socket.off(SOCKET_EVENTS.FRIENDS_ONLINE_SNAPSHOT);
  socket.off(SOCKET_EVENTS.WAITING);
  socket.off(SOCKET_EVENTS.MATCHED);
  socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
  socket.off(SOCKET_EVENTS.PARTNER_MESSAGE_VIEWED);
  socket.off(SOCKET_EVENTS.PARTNER_TYPING);
  socket.off(SOCKET_EVENTS.PARTNER_DISCONNECTED);
  socket.off(SOCKET_EVENTS.PARTNER_REQUESTED_MEDIA);
  socket.off(SOCKET_EVENTS.MEDIA_PERMISSION_GRANTED);
  socket.off(SOCKET_EVENTS.GAME_INVITED);
  socket.off(SOCKET_EVENTS.GAME_STARTED);
  socket.off(SOCKET_EVENTS.GAME_PARTNER_MOVE);
  socket.off(SOCKET_EVENTS.GAME_CANCELLED);
  socket.off(SOCKET_EVENTS.DOODLE_PARTNER_DRAW);
  socket.off(SOCKET_EVENTS.DOODLE_PARTNER_CLEAR);
  socket.off(SOCKET_EVENTS.ONLINE_COUNT);
  socket.off(SOCKET_EVENTS.AUTH_REQUIRED_FOR_FRIEND);
  socket.off(SOCKET_EVENTS.PARTNER_NOT_LOGGED_IN);
  socket.off(SOCKET_EVENTS.FRIEND_REQUEST_SENT);
  socket.off(SOCKET_EVENTS.NEW_FRIEND_REQUEST);
  socket.off(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED);
  socket.off(SOCKET_EVENTS.FRIEND_REQUEST_DECLINED);
  socket.off(SOCKET_EVENTS.ALREADY_FRIENDS);
  socket.off(SOCKET_EVENTS.REQUEST_ALREADY_SENT);
  socket.off(SOCKET_EVENTS.CANNOT_ADD_SELF);
  socket.off(SOCKET_EVENTS.PARTNER_AUTHENTICATED);
  socket.off(SOCKET_EVENTS.PARTNER_MESSAGE_REACTION);
  socket.off(SOCKET_EVENTS.RECEIVE_DIRECT_MESSAGE);
  socket.off(SOCKET_EVENTS.DIRECT_MESSAGE_SENT);
}
