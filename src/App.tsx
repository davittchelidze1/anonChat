/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import { useFriends } from './hooks/useFriends';
import { useChat } from './hooks/useChat';
import { useGameState } from './hooks/useGameState';
import { AppState, Friend, User } from './types';
import { LandingView } from './components/LandingView';
import { WaitingView } from './components/WaitingView';
import { ChatView } from './components/ChatView';
import { ImageModal } from './components/ImageModal';
import { AuthModal } from './components/AuthModal';
import { FriendsView } from './components/FriendsView';
import { ProfileModal } from './components/ProfileModal';
import { UserPlus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SOCKET_EVENTS } from './events';
import { NOTIFICATION_TIMEOUT_MS, AVATAR_COLORS } from './constants';
import { FriendService } from './services/friendService';
import { createSystemMessage, generateStrangerAlias, getRandomAvatarColor } from './utils/helpers';
import {
  setupAllSocketHandlers,
  cleanupAllSocketHandlers
} from './handlers/socketHandlers';

export default function App() {
  const socket = useSocket();
  const { user, isAuthReady, fetchUser, setUser } = useAuth();
  const { friends, requests, setFriends, setRequests, fetchFriends } = useFriends();

  const [state, setState] = useState<AppState>('landing');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [pendingFriendRequest, setPendingFriendRequest] = useState<{ fromId: string; fromUsername: string } | null>(null);
  const [pendingMessageNotification, setPendingMessageNotification] = useState<{ senderId: string; senderUsername: string; text: string } | null>(null);
  const stateRef = useRef<AppState>(state);
  const selectedFriendIdRef = useRef<string | null>(null);
  const latestMessageByFriendRef = useRef<Map<string, string>>(new Map());
  const friendNameByIdRef = useRef<Map<string, string>>(new Map());

  // Use custom hooks for chat and game state
  const isDirectChat = state === 'direct-chat';
  const chat = useChat(socket, user, selectedFriend, isDirectChat);
  const gamePartnerUserId = isDirectChat ? (selectedFriend?.id || null) : chat.partnerUserId;
  const game = useGameState(socket, gamePartnerUserId);
  const totalUnreadCount = friends.reduce((sum, friend) => sum + (friend.unreadCount || 0), 0);

  const sortFriendsByRecent = (list: Friend[]) => {
    return [...list].sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  };

  // Reset partner info when entering chat state
  useEffect(() => {
    if (state === 'chatting') {
      chat.setPartnerColor(getRandomAvatarColor());
      chat.setPartnerAlias(generateStrangerAlias());
      chat.setMediaAllowed(false);
      chat.setMediaRequested(false);
      chat.setPartnerRequestedMedia(false);
      game.setGameState(null);
    }
  }, [state]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show system notification
  const showSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  };

  // Auto-dismiss message notification
  useEffect(() => {
    if (pendingMessageNotification) {
      const timer = setTimeout(() => {
        setPendingMessageNotification(null);
      }, NOTIFICATION_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [pendingMessageNotification]);

  useEffect(() => {
    stateRef.current = state;
    selectedFriendIdRef.current = selectedFriend?.id || null;
  }, [state, selectedFriend?.id]);

  useEffect(() => {
    const nameMap = new Map<string, string>();
    friends.forEach((friend) => {
      nameMap.set(friend.id, friend.username);
    });
    friendNameByIdRef.current = nameMap;
  }, [friends]);

  // Realtime last-message previews + unread counters for all friends.
  useEffect(() => {
    if (!user || friends.length === 0) return;

    let cancelled = false;
    const unsubs: Array<() => void> = [];
    const friendIds = friends.map((friend) => friend.id);

    const setupListeners = async () => {
      const { db } = await import('./firebase');
      const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');

      if (cancelled) return;

      friendIds.forEach((friendId) => {
        const chatId = [user.id, friendId].sort().join('_');
        const messagesRef = collection(db, 'directMessages', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) return;

          const raw = snapshot.docs[0].data() as {
            id?: string;
            senderId?: string;
            text?: string;
            image?: string;
            video?: string;
            timestamp?: string;
          };

          const messageId = raw.id || snapshot.docs[0].id;
          const previousId = latestMessageByFriendRef.current.get(friendId);
          const isInitialSnapshot = previousId === undefined;
          const isNewMessage = previousId !== messageId;
          latestMessageByFriendRef.current.set(friendId, messageId);

          const previewText = raw.text || (raw.image ? 'Sent an image' : raw.video ? 'Sent a video' : 'New message');
          const previewTime = raw.timestamp || new Date().toISOString();

          setFriends((prev) => sortFriendsByRecent(prev.map((friend) => {
            if (friend.id !== friendId) return friend;
            return {
              ...friend,
              lastMessageId: messageId,
              lastMessage: previewText,
              lastMessageAt: previewTime,
            };
          })));

          if (isInitialSnapshot || !isNewMessage) return;

          const isIncoming = !!raw.senderId && raw.senderId !== user.id;
          if (!isIncoming) return;

          const isActiveDirectChat =
            stateRef.current === 'direct-chat' &&
            selectedFriendIdRef.current === friendId;

          if (isActiveDirectChat) return;

          const senderName = friendNameByIdRef.current.get(friendId) || 'Unknown user';
          setFriends((prev) => {
            const next = sortFriendsByRecent(prev.map((friend) => {
              if (friend.id !== friendId) return friend;
              return {
                ...friend,
                unreadCount: (friend.unreadCount || 0) + 1,
              };
            }));
            return next;
          });

          setPendingMessageNotification({
            senderId: friendId,
            senderUsername: senderName,
            text: previewText,
          });
          showSystemNotification(`New message from ${senderName}`, previewText);
        });

        unsubs.push(unsubscribe);
      });
    };

    setupListeners();

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.id, friends.map((friend) => friend.id).join(',')]);

  useEffect(() => {
    if (!user) {
      latestMessageByFriendRef.current.clear();
    }
  }, [user?.id]);

  // Refresh friend presence snapshot whenever the friend list changes.
  useEffect(() => {
    if (!socket || !user || friends.length === 0) return;
    socket.emit(
      SOCKET_EVENTS.REQUEST_FRIENDS_ONLINE_STATUS,
      friends.map((friend) => friend.id)
    );
  }, [socket, user?.id, friends.map((friend) => friend.id).join(',')]);

  // Handle starting direct chat with a friend
  const handleStartDirectChat = async (friend: Friend) => {
    const isSameFriend = selectedFriend?.id === friend.id;
    setFriends((prev) => prev.map((f) => (
      f.id === friend.id ? { ...f, unreadCount: 0 } : f
    )));
    setSelectedFriend(friend);
    if (!isSameFriend) {
      chat.setMessages([]);
    }
    setState('direct-chat');
  };

  // Setup socket event handlers
  useEffect(() => {
    if (!socket) return;

    const deps = {
      socket,
      setState,
      setMessages: chat.setMessages,
      setIsPartnerTyping: chat.setIsPartnerTyping,
      setPartnerUserId: chat.setPartnerUserId,
      setMediaAllowed: chat.setMediaAllowed,
      setMediaRequested: chat.setMediaRequested,
      setPartnerRequestedMedia: chat.setPartnerRequestedMedia,
      setGameState: game.setGameState,
      setOnlineCount,
      setIsAuthModalOpen,
      setFriends,
      setPendingFriendRequest,
      setPendingMessageNotification,
      fetchFriends,
      showSystemNotification,
      handleStartDirectChat,
      state,
      selectedFriend,
      friends,
      partnerUserId: chat.partnerUserId,
    };

    setupAllSocketHandlers(deps);

    return () => {
      cleanupAllSocketHandlers(socket);
    };
  }, [socket, state, selectedFriend, friends]);

  // Keep socket auth state aligned with Firebase auth state.
  // This covers persisted sessions where UI is signed in but socket connected before auth was ready.
  useEffect(() => {
    if (!socket || !isAuthReady) return;

    let isCancelled = false;

    const syncSocketAuth = async () => {
      try {
        const { auth } = await import('./firebase');

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          if (isCancelled) return;

          localStorage.setItem('anon_chat_token', token);
          if (socket.auth) {
            (socket.auth as { token?: string }).token = token;
          }
          socket.emit(SOCKET_EVENTS.AUTHENTICATE, token);
          return;
        }

        if (isCancelled) return;

        localStorage.removeItem('anon_chat_token');
        if (socket.auth) {
          (socket.auth as { token?: string }).token = undefined;
        }
        socket.emit(SOCKET_EVENTS.AUTHENTICATE, null);
      } catch (error) {
        console.error('Failed to sync socket auth state:', error);
      }
    };

    syncSocketAuth();

    return () => {
      isCancelled = true;
    };
  }, [socket, isAuthReady, user?.id]);

  const startSearching = () => {
    chat.setMessages([]);
    socket?.emit(SOCKET_EVENTS.JOIN_QUEUE);
  };

  const skipChat = () => {
    socket?.emit(SOCKET_EVENTS.LEAVE_CHAT);
    chat.setPartnerUserId(null);
    startSearching();
  };

  const stopChat = () => {
    if (state === 'direct-chat') {
      setState('friends');
    } else {
      socket?.emit(SOCKET_EVENTS.LEAVE_CHAT);
      setState('landing');
    }
    chat.setMessages([]);
    chat.setPartnerUserId(null);
    setSelectedFriend(null);
  };

  const resolvePartnerUserId = async (): Promise<string | null> => {
    if (!socket) return null;

    return await new Promise((resolve) => {
      socket.timeout(3000).emit(
        SOCKET_EVENTS.RESOLVE_PARTNER_USER,
        (err: unknown, payload?: { partnerUserId?: string | null }) => {
          if (err) {
            resolve(null);
            return;
          }
          resolve(payload?.partnerUserId || null);
        }
      );
    });
  };

  const handleAddFriend = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      chat.setMessages((prev) => [...prev, createSystemMessage(
        'Login to add friends and save conversations.',
        'system-auth'
      )]);
      return;
    }

    let targetPartnerId = chat.partnerUserId;
    if (!targetPartnerId) {
      targetPartnerId = await resolvePartnerUserId();
      if (targetPartnerId) {
        chat.setPartnerUserId(targetPartnerId);
      }
    }

    if (!targetPartnerId) {
      chat.setMessages((prev) => [...prev, createSystemMessage(
        'This stranger is not logged in and cannot be added as a friend.',
        'system-no-auth'
      )]);
      return;
    }

    if (requests.some(r => r.fromId === targetPartnerId)) {
      handleAcceptFriendRequest(targetPartnerId);
    } else {
      try {
        await FriendService.sendFriendRequest(targetPartnerId);
        chat.setMessages((prev) => [...prev, createSystemMessage(
          'Friend request sent.',
          'system-req'
        )]);
        socket?.emit(SOCKET_EVENTS.FRIEND_REQUEST_SENT, targetPartnerId);
      } catch (err: any) {
        console.error('Failed to send friend request', err);

        const errorMessage = err.message === 'quota_exceeded'
          ? 'Rate limit reached: max 20 friend requests per hour.'
          : err.message === 'already_friends'
          ? 'You are already friends with this user.'
          : err.message === 'request_already_sent'
          ? 'You have already sent a friend request to this user.'
          : err.message === 'invalid_target'
          ? 'This stranger account is not fully set up yet. Ask them to finish sign-in and try again.'
          : err.message === 'unauthorized'
          ? 'Your session expired. Please sign out and sign in again.'
          : err.message === 'server_not_configured'
          ? 'Friend requests are not configured on server yet. Please check Firebase Admin setup.'
          : err.message === 'server_database_mismatch'
          ? 'Server is connected to the wrong Firestore database. Set FIREBASE_DATABASE_ID on server to match VITE_FIREBASE_DATABASE_ID.'
          : 'Failed to send friend request.';

        chat.setMessages((prev) => [...prev, createSystemMessage(errorMessage, 'system-error')]);
      }
    }
  };

  const handleAcceptFriendRequest = async (fromId: string) => {
    if (!user) {
      chat.setMessages((prev) => [...prev, createSystemMessage(
        'Login to accept friend requests.',
        'system-auth'
      )]);
      return;
    }
    try {
      await FriendService.acceptFriendRequest(fromId);
      fetchFriends();
      socket?.emit(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, fromId);
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const handleDeclineFriendRequest = async (fromId: string) => {
    if (!user) {
      chat.setMessages((prev) => [...prev, createSystemMessage(
        'Login to manage friend requests.',
        'system-auth'
      )]);
      return;
    }
    try {
      await FriendService.declineFriendRequest(fromId);
      fetchFriends();
    } catch (err) {
      console.error('Failed to decline friend request', err);
    }
  };

  const handleLogout = async () => {
    try {
      const { auth } = await import('./firebase');
      await auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
    setFriends([]);
    setRequests([]);
    localStorage.removeItem('anon_chat_token');
    localStorage.removeItem('anon_chat_anonymous_disabled');
    if (socket && socket.auth) {
      (socket.auth as { token?: string }).token = undefined;
    }
    socket?.emit(SOCKET_EVENTS.AUTHENTICATE, null);
  };

  const handleUpdateUsername = async (username: string) => {
    if (!user) {
      throw new Error('You must be logged in.');
    }

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 24);

    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters.');
    }

    const { db } = await import('./firebase');
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', user.id), { username: cleanUsername });
    setUser((prev) => (prev ? { ...prev, username: cleanUsername } : prev));
  };

  const handleAuthSuccess = (userData: User, token: string) => {
    setUser(userData);
    fetchFriends();
    localStorage.setItem('anon_chat_anonymous_disabled', '1');
    localStorage.setItem('anon_chat_token', token);
    if (socket && socket.auth) {
      (socket.auth as { token?: string }).token = token;
    }
    socket?.emit(SOCKET_EVENTS.AUTHENTICATE, token);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {state === 'landing' && (
          <LandingView
            onlineCount={onlineCount}
            user={user}
            friends={friends}
            totalUnreadCount={totalUnreadCount}
            onStartSearching={startSearching}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onOpenFriends={() => setState('friends')}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onStartChat={handleStartDirectChat}
          />
        )}

        {state === 'waiting' && (
          <WaitingView onStopChat={stopChat} onlineCount={onlineCount} />
        )}

        {state === 'friends' && (
          <FriendsView
            friends={friends}
            requests={requests}
            onBack={() => setState('landing')}
            onAcceptRequest={handleAcceptFriendRequest}
            onDeclineRequest={handleDeclineFriendRequest}
            onStartChat={handleStartDirectChat}
          />
        )}

        {(state === 'chatting' || state === 'direct-chat') && (
          <ChatView
            messages={chat.messages}
            inputText={chat.inputText}
            isPartnerTyping={chat.isPartnerTyping}
            partnerAlias={state === 'direct-chat' ? selectedFriend?.username || 'Friend' : chat.partnerAlias}
            partnerColor={state === 'direct-chat' ? selectedFriend?.avatarColor || 'indigo' : chat.partnerColor}
            mediaAllowed={state === 'direct-chat' ? true : chat.mediaAllowed}
            mediaRequested={chat.mediaRequested}
            partnerRequestedMedia={chat.partnerRequestedMedia}
            gameState={game.gameState}
            user={user}
            partnerUserId={state === 'direct-chat' ? selectedFriend?.id || null : chat.partnerUserId}
            friends={friends}
            requests={requests}
            isDirectChat={state === 'direct-chat'}
            onSendMessage={chat.sendMessage}
            onInputChange={chat.handleInputChange}
            onFileSelect={chat.handleFileSelect}
            onVideoSelect={chat.handleVideoSelect}
            onRequestMedia={chat.requestMediaPermission}
            onSkipChat={skipChat}
            onStopChat={stopChat}
            onImageClick={(src, id) => {
              setSelectedImage(src);
              if (id) chat.handleMessageView(id);
            }}
            onGameInvite={game.handleGameInvite}
            onGameMove={game.handleGameMove}
            onGameCancel={game.handleGameCancel}
            onGameAccept={game.handleGameAccept}
            onAddFriend={handleAddFriend}
            onAcceptFriend={handleAcceptFriendRequest}
            onDeclineFriend={handleDeclineFriendRequest}
            onReaction={chat.handleReaction}
            onDoodleDraw={game.handleDoodleDraw}
            onDoodleClear={game.handleDoodleClear}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            fileInputRef={chat.fileInputRef}
            videoInputRef={chat.videoInputRef}
            messagesEndRef={chat.messagesEndRef}
          />
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={handleLogout}
        friendCount={friends.length}
        onUpdateUsername={handleUpdateUsername}
      />

      <ImageModal
        selectedImage={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <AnimatePresence>
        {pendingFriendRequest && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-emerald-600/20 flex items-center justify-center border border-indigo-500/40 animate-bounce-subtle">
                <UserPlus className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">Friend Request 🎉</h4>
                <p className="text-xs text-zinc-400 truncate">{pendingFriendRequest.fromUsername} wants to connect!</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  handleAcceptFriendRequest(pendingFriendRequest.fromId);
                  setPendingFriendRequest(null);
                }}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  handleDeclineFriendRequest(pendingFriendRequest.fromId);
                  setPendingFriendRequest(null);
                }}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}

        {pendingMessageNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={() => {
              const friend = friends.find(f => f.id === pendingMessageNotification.senderId);
              if (friend) handleStartDirectChat(friend);
              setPendingMessageNotification(null);
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl cursor-pointer hover:bg-zinc-800 hover:scale-105 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/20 flex items-center justify-center border border-emerald-500/40 animate-bounce-subtle">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{pendingMessageNotification.senderUsername}</h4>
                <p className="text-xs text-zinc-400 truncate">{pendingMessageNotification.text}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
