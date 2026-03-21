/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import { useFriends } from './hooks/useFriends';
import { AppState, Friend, FriendRequest, GameState, GameType, Message, User } from './types';
import { LandingView } from './components/LandingView';
import { WaitingView } from './components/WaitingView';
import { ChatView } from './components/ChatView';
import { ImageModal } from './components/ImageModal';
import { AuthModal } from './components/AuthModal';
import { FriendsView } from './components/FriendsView';
import { ProfileModal } from './components/ProfileModal';
import { UserPlus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const socket = useSocket();
  const { user, fetchUser, setUser } = useAuth();
  const { friends, requests, setFriends, setRequests, fetchFriends } = useFriends();

  const [state, setState] = useState<AppState>('landing');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerAlias, setPartnerAlias] = useState('Stranger');
  const [partnerColor, setPartnerColor] = useState('indigo');
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // user, friends, requests moved to hooks
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [pendingFriendRequest, setPendingFriendRequest] = useState<{ fromId: string; fromUsername: string } | null>(null);
  const [pendingMessageNotification, setPendingMessageNotification] = useState<{ senderId: string; senderUsername: string; text: string } | null>(null);
  const [mediaAllowed, setMediaAllowed] = useState(false);
  const [mediaRequested, setMediaRequested] = useState(false);
  const [partnerRequestedMedia, setPartnerRequestedMedia] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  // socket moved to hook
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === 'chatting') {
      const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
      const selectedColor = colors[Math.floor(Math.random() * colors.length)];
      setPartnerColor(selectedColor);
      setPartnerAlias(`Stranger ${Math.floor(Math.random() * 9000) + 1000}`);
      setMediaAllowed(false);
      setMediaRequested(false);
      setPartnerRequestedMedia(false);
      setGameState(null);
    }
  }, [state]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico' // Or a better icon if available
      });
    }
  };

  useEffect(() => {
    if (pendingMessageNotification) {
      const timer = setTimeout(() => {
        setPendingMessageNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingMessageNotification]);


  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => {
      setState('waiting');
    };

    const onMatched = ({ partnerUserId }: { partnerUserId?: string }) => {
      setState('chatting');
      setPartnerUserId(partnerUserId || null);
      setMessages([{ id: 'system-start', text: 'You are now chatting with a stranger. Say hi! (Double-tap or long-press a message to react)', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onReceiveMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onPartnerMessageViewed = (messageId: string) => {
      // We don't increment viewCount here anymore because we want independent view limits for each user.
      // This event can be used for "Seen" status in the future.
      /*
      setMessages((prev) => prev.map(m => {
        if (m.id === messageId) {
          const newCount = (m.viewCount || 0) + 1;
          const isViewed = m.maxViews ? newCount >= m.maxViews : false;
          return { ...m, viewCount: newCount, isViewed };
        }
        return m;
      }));
      */
    };

    const onPartnerTyping = (isTyping: boolean) => {
      setIsPartnerTyping(isTyping);
    };

    const onPartnerDisconnected = () => {
      setMessages((prev) => [...prev, { id: `system-disc-${Date.now()}`, text: 'Stranger has disconnected.', sender: 'system', timestamp: new Date().toISOString() }]);
      setIsPartnerTyping(false);
      setMediaAllowed(false);
      setMediaRequested(false);
      setPartnerRequestedMedia(false);
      setGameState(null);
    };

    const onPartnerRequestedMedia = () => {
      setPartnerRequestedMedia(true);
      setMessages((prev) => [...prev, { id: `system-media-${Date.now()}`, text: 'Stranger wants to share photos/videos. Click the media icon to accept.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onMediaPermissionGranted = () => {
      setMediaAllowed(true);
      setMessages((prev) => [...prev, { id: `system-granted-${Date.now()}`, text: 'Media sharing enabled! You can now send photos and videos.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onGameInvited = (gameType: GameType) => {
      setMessages((prev) => [...prev, { id: `system-game-${Date.now()}`, text: `Stranger invited you to play ${gameType === 'tictactoe' ? 'Tic-Tac-Toe' : 'Rock Paper Scissors'}!`, sender: 'system', timestamp: new Date().toISOString() }]);
      setGameState({
        type: gameType,
        status: 'inviting',
        turn: 'partner'
      });
    };

    const onGameStarted = ({ gameType, starter }: { gameType: GameType, starter: 'me' | 'partner' }) => {
      setGameState({
        type: gameType,
        status: 'playing',
        turn: starter,
        board: gameType === 'tictactoe' ? Array(9).fill(null) : undefined,
        strokes: gameType === 'doodle' ? [] : undefined
      });
    };

    const onGamePartnerMove = (move: any) => {
      setGameState((prev) => {
        if (!prev) return null;
        
        if (prev.type === 'tictactoe') {
          const newBoard = [...(prev.board || [])];
          newBoard[move] = 'O';
          
          const winner = checkTicTacToeWinner(newBoard);
          if (winner) {
            return { ...prev, board: newBoard, status: 'ended', winner: winner === 'O' ? 'partner' : (winner === 'draw' ? 'draw' : 'me') };
          }
          
          return { ...prev, board: newBoard, turn: 'me' };
        } else if (prev.type === 'rps') {
          if (prev.myMove) {
            const winner = checkRPSWinner(prev.myMove, move);
            return { ...prev, partnerMove: move, status: 'ended', winner };
          }
          return { ...prev, partnerMove: move };
        }
        return prev;
      });
    };

    const onGameCancelled = () => {
      setGameState(null);
      setMessages((prev) => [...prev, { id: `system-cancel-${Date.now()}`, text: 'Game was cancelled.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onDoodlePartnerDraw = (stroke: { x: number; y: number; color: string; isStart: boolean }) => {
      setGameState((prev) => {
        if (!prev || prev.type !== 'doodle') return prev;
        return {
          ...prev,
          strokes: [...(prev.strokes || []), stroke]
        };
      });
    };

    const onDoodlePartnerClear = () => {
      setGameState((prev) => {
        if (!prev || prev.type !== 'doodle') return prev;
        return {
          ...prev,
          strokes: []
        };
      });
    };

    const onOnlineCount = (count: number) => {
      setOnlineCount(count);
    };

    const onAuthRequiredForFriend = () => {
      setIsAuthModalOpen(true);
      setMessages((prev) => [...prev, { id: `system-auth-${Date.now()}`, text: 'You need to be logged in to add friends.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onPartnerNotLoggedIn = () => {
      setMessages((prev) => [...prev, { id: `system-no-auth-${Date.now()}`, text: 'This stranger is not logged in and cannot be added as a friend.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onFriendRequestSent = () => {
      setMessages((prev) => [...prev, { id: `system-fr-sent-${Date.now()}`, text: 'Friend request sent!', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onNewFriendRequest = ({ fromId, fromUsername }: { fromId: string; fromUsername: string }) => {
      fetchFriends();
      // Only show popup notification if we are not currently chatting with this person
      if (partnerUserId !== fromId && selectedFriend?.id !== fromId) {
        setPendingFriendRequest({ fromId, fromUsername });
      }
      setMessages((prev) => [...prev, { id: `system-fr-new-${Date.now()}`, text: `${fromUsername} sent you a friend request!`, sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onFriendRequestAccepted = () => {
      fetchFriends();
      setMessages((prev) => [...prev, { id: `system-fr-acc-${Date.now()}`, text: 'You are now friends!', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onFriendRequestDeclined = () => {
      fetchFriends();
    };

    const onAlreadyFriends = () => {
      setMessages((prev) => [...prev, { id: `system-fr-already-${Date.now()}`, text: 'You are already friends with this user.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onRequestAlreadySent = () => {
      setMessages((prev) => [...prev, { id: `system-fr-already-sent-${Date.now()}`, text: 'You have already sent a friend request to this user.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onPartnerAuthenticated = (userId: string | null) => {
      setPartnerUserId(userId);
      if (userId) {
        setMessages((prev) => [...prev, { id: `system-partner-auth-${Date.now()}`, text: 'Stranger has logged in. You can now add them as a friend!', sender: 'system', timestamp: new Date().toISOString() }]);
      } else {
        setMessages((prev) => [...prev, { id: `system-partner-unauth-${Date.now()}`, text: 'Stranger has logged out.', sender: 'system', timestamp: new Date().toISOString() }]);
      }
    };

    const onPartnerMessageReaction = ({ messageId, emoji }: { messageId: string, emoji: string }) => {
      setMessages((prev) => prev.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...m, reactions };
        }
        return m;
      }));
    };

    const onReceiveDirectMessage = (msg: any) => {
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
    };

    const onDirectMessageSent = (msg: any) => {
      if (state === 'direct-chat' && selectedFriend?.id === msg.toId) {
        setMessages((prev) => {
          // Avoid duplicate messages if we already added it optimistically
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchFriends();
    };

    const onCannotAddSelf = () => {
      setMessages((prev) => [...prev, { id: `system-fr-self-${Date.now()}`, text: 'You cannot add yourself as a friend.', sender: 'system', timestamp: new Date().toISOString() }]);
    };

    const onConnect = () => {
      // Re-authenticate socket on reconnect using stored token
      const storedToken = localStorage.getItem('anon_chat_token');
      if (storedToken) {
        socket.emit('authenticate', storedToken);
      }
      fetchFriends();
      if (state === 'direct-chat' && selectedFriend) {
        handleStartDirectChat(selectedFriend);
      }
    };

    const onFriendStatus = ({ userId, isOnline }: { userId: string, isOnline: boolean }) => {
      setFriends(prev => prev.map(f => 
        f.id === userId ? { ...f, isOnline } : f
      ));
    };

    socket.on('connect', onConnect);
    socket.on('friend-status', onFriendStatus);
    socket.on('waiting', onWaiting);
    socket.on('matched', onMatched);
    socket.on('receive-message', onReceiveMessage);
    socket.on('partner-message-viewed', onPartnerMessageViewed);
    socket.on('partner-typing', onPartnerTyping);
    socket.on('partner-disconnected', onPartnerDisconnected);
    socket.on('partner-requested-media', onPartnerRequestedMedia);
    socket.on('media-permission-granted', onMediaPermissionGranted);
    socket.on('game-invited', onGameInvited);
    socket.on('game-started', onGameStarted);
    socket.on('game-partner-move', onGamePartnerMove);
    socket.on('game-cancelled', onGameCancelled);
    socket.on('doodle-partner-draw', onDoodlePartnerDraw);
    socket.on('doodle-partner-clear', onDoodlePartnerClear);
    socket.on('online-count', onOnlineCount);
    socket.on('auth-required-for-friend', onAuthRequiredForFriend);
    socket.on('partner-not-logged-in', onPartnerNotLoggedIn);
    socket.on('friend-request-sent', onFriendRequestSent);
    socket.on('new-friend-request', onNewFriendRequest);
    socket.on('friend-request-accepted', onFriendRequestAccepted);
    socket.on('friend-request-declined', onFriendRequestDeclined);
    socket.on('already-friends', onAlreadyFriends);
    socket.on('request-already-sent', onRequestAlreadySent);
    socket.on('cannot-add-self', onCannotAddSelf);
    socket.on('partner-authenticated', onPartnerAuthenticated);
    socket.on('partner-message-reaction', onPartnerMessageReaction);
    socket.on('receive-direct-message', onReceiveDirectMessage);
    socket.on('direct-message-sent', onDirectMessageSent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('friend-status', onFriendStatus);
      socket.off('waiting', onWaiting);
      socket.off('matched', onMatched);
      socket.off('receive-message', onReceiveMessage);
      socket.off('partner-message-viewed', onPartnerMessageViewed);
      socket.off('partner-typing', onPartnerTyping);
      socket.off('partner-disconnected', onPartnerDisconnected);
      socket.off('partner-requested-media', onPartnerRequestedMedia);
      socket.off('media-permission-granted', onMediaPermissionGranted);
      socket.off('game-invited', onGameInvited);
      socket.off('game-started', onGameStarted);
      socket.off('game-partner-move', onGamePartnerMove);
      socket.off('game-cancelled', onGameCancelled);
      socket.off('doodle-partner-draw', onDoodlePartnerDraw);
      socket.off('doodle-partner-clear', onDoodlePartnerClear);
      socket.off('online-count', onOnlineCount);
      socket.off('auth-required-for-friend', onAuthRequiredForFriend);
      socket.off('partner-not-logged-in', onPartnerNotLoggedIn);
      socket.off('friend-request-sent', onFriendRequestSent);
      socket.off('new-friend-request', onNewFriendRequest);
      socket.off('friend-request-accepted', onFriendRequestAccepted);
      socket.off('friend-request-declined', onFriendRequestDeclined);
      socket.off('already-friends', onAlreadyFriends);
      socket.off('request-already-sent', onRequestAlreadySent);
      socket.off('cannot-add-self', onCannotAddSelf);
      socket.off('partner-authenticated', onPartnerAuthenticated);
      socket.off('partner-message-reaction', onPartnerMessageReaction);
      socket.off('receive-direct-message', onReceiveDirectMessage);
      socket.off('direct-message-sent', onDirectMessageSent);
    };
  }, [socket, state, selectedFriend, friends]);

  const checkTicTacToeWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every(cell => cell !== null)) return 'draw';
    return null;
  };

  const checkRPSWinner = (myMove: string, partnerMove: string): 'me' | 'partner' | 'draw' => {
    if (myMove === partnerMove) return 'draw';
    if (
      (myMove === 'rock' && partnerMove === 'scissors') ||
      (myMove === 'paper' && partnerMove === 'rock') ||
      (myMove === 'scissors' && partnerMove === 'paper')
    ) {
      return 'me';
    }
    return 'partner';
  };

  const handleGameInvite = (type: GameType) => {
    socket?.emit('game-invite', type);
    setGameState({
      type,
      status: 'inviting',
      turn: 'me'
    });
  };

  const handleGameAccept = (type: GameType) => {
    socket?.emit('game-accept', type);
  };

  const handleDoodleDraw = (stroke: { x: number; y: number; color: string; isStart: boolean }) => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: [...(prev.strokes || []), stroke]
      };
    });
    socket?.emit('doodle-draw', stroke);
  };

  const handleDoodleClear = () => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: []
      };
    });
    socket?.emit('doodle-clear');
  };

  const handleGameCancel = () => {
    socket?.emit('game-cancel');
    setGameState(null);
  };

  const handleGameMove = (move: any) => {
    if (!gameState || gameState.status !== 'playing') return;
    
    if (gameState.type === 'tictactoe') {
      if (gameState.turn !== 'me' || gameState.board?.[move] !== null) return;
      
      const newBoard = [...(gameState.board || [])];
      newBoard[move] = 'X';
      socket?.emit('game-move', move);
      
      const winner = checkTicTacToeWinner(newBoard);
      if (winner) {
        setGameState({ ...gameState, board: newBoard, status: 'ended', winner: winner === 'X' ? 'me' : (winner === 'draw' ? 'draw' : 'partner') });
      } else {
        setGameState({ ...gameState, board: newBoard, turn: 'partner' });
      }
    } else if (gameState.type === 'rps') {
      if (gameState.myMove) return;
      socket?.emit('game-move', move);
      
      if (gameState.partnerMove) {
        const winner = checkRPSWinner(move, gameState.partnerMove);
        setGameState({ ...gameState, myMove: move, status: 'ended', winner });
      } else {
        setGameState({ ...gameState, myMove: move });
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const startSearching = () => {
    setMessages([]);
    socket?.emit('join-queue');
  };

  const handleMessageView = (messageId: string) => {
    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        const newCount = (m.viewCount || 0) + 1;
        const isViewed = m.maxViews ? newCount >= m.maxViews : false;
        if (!m.isViewed) {
          const partnerId = state === 'direct-chat' ? selectedFriend?.id : null;
          socket?.emit('message-viewed', { messageId, partnerId });
        }
        return { ...m, viewCount: newCount, isViewed };
      }
      return m;
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File too large (max 5MB)');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const messageId = Math.random().toString(36).substring(2, 15);
        const newMessage: Message = {
          id: messageId,
          text: '',
          image: base64,
          sender: 'me',
          timestamp: new Date().toISOString(),
          maxViews: 2,
          viewCount: 0
        };

        setMessages((prev) => [...prev, newMessage]);
        if (state === 'direct-chat' && selectedFriend) {
          socket?.emit('send-direct-message', { id: messageId, text: '', image: base64, toId: selectedFriend.id, maxViews: 2 });
        } else {
          socket?.emit('send-message', { id: messageId, text: '', image: base64, maxViews: 2 });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Video too large (max 15MB)');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src);
      // @ts-ignore
      if (video.duration > 10.5) { // slightly lenient
        alert('Video must be 10 seconds or less');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const messageId = Math.random().toString(36).substring(2, 15);
        const newMessage: Message = {
          id: messageId,
          text: '',
          video: base64,
          sender: 'me',
          timestamp: new Date().toISOString(),
          maxViews: 2,
          viewCount: 0
        };

        setMessages((prev) => [...prev, newMessage]);
        if (state === 'direct-chat' && selectedFriend) {
          socket?.emit('send-direct-message', { id: messageId, text: '', video: base64, toId: selectedFriend.id, maxViews: 2 });
        } else {
          socket?.emit('send-message', { id: messageId, text: '', video: base64, maxViews: 2 });
        }
      };
      reader.readAsDataURL(file);
    };
    video.src = URL.createObjectURL(file);
    
    // Reset input
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

    const handleStartDirectChat = async (friend: Friend) => {
    const isSameFriend = selectedFriend?.id === friend.id;
    setSelectedFriend(friend);
    if (!isSameFriend) {
      setMessages([]);
    }
    setState('direct-chat');
    const currentFriendId = friend.id;
    try {
      const res = await fetch(`/api/messages/${friend.id}`);
      if (res.ok) {
        const data = await res.json();
        // Only update if we are still chatting with the same friend
        setSelectedFriend(prev => {
          if (prev?.id === currentFriendId) {
            const history = data.map((m: any) => ({
              ...m,
              sender: m.senderId === user?.id ? 'me' : 'partner',
              isViewed: m.maxViews ? (m.viewCount || 0) >= m.maxViews : false
            }));
            
            setMessages(prevMsgs => {
              // If it's the same friend, we merge history with current messages
              // If it's a new friend, prevMsgs will be empty anyway
              const newOptimistic = prevMsgs.filter(m => !history.some((h: any) => h.id === m.id));
              return [...history, ...newOptimistic];
            });
          }
          return prev;
        });
      }
    } catch (e) {}
  };

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !socket) return;

    // Check if user is asking about the AI model
    const modelQueries = [
      /which model (are|r) (you|u)(\s+now)?/i,
      /what model (are|r) (you|u)(\s+using)?/i,
      /tell me (your|the) model/i,
      /what (ai|model) (is this|are you)/i
    ];

    const isModelQuery = modelQueries.some(regex => regex.test(inputText));

    if (state === 'direct-chat' && selectedFriend) {
      const messageId = Math.random().toString(36).substring(2, 15);
      const newMessage: Message = {
        id: messageId,
        text: inputText,
        sender: 'me',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMessage]);
      socket.emit('send-direct-message', {
        id: messageId,
        toId: selectedFriend.id,
        text: inputText
      });
      setInputText('');
      socket.emit('typing', false);
      return;
    }

    const messageId = Math.random().toString(36).substring(2, 15);
    const newMessage: Message = {
      id: messageId,
      text: inputText,
      sender: 'me',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    socket.emit('send-message', { id: messageId, text: inputText });
    setInputText('');
    socket.emit('typing', false);

    // Respond to model query with system message
    if (isModelQuery) {
      setTimeout(() => {
        const modelInfo = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
          ? 'I am powered by Google Gemini 1.5 Flash, a fast and efficient AI model designed for real-time conversations.'
          : 'I am an AnonChat application. AI model features are available when GEMINI_API_KEY is configured.';

        setMessages((prev) => [...prev, {
          id: `system-model-info-${Date.now()}`,
          text: modelInfo,
          sender: 'system',
          timestamp: new Date().toISOString()
        }]);
      }, 500);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    socket?.emit('typing', e.target.value.length > 0);
  };

  const requestMediaPermission = () => {
    if (mediaAllowed || mediaRequested) return;
    socket?.emit('request-media-permission');
    setMediaRequested(true);
    setMessages((prev) => [...prev, { id: `system-req-${Date.now()}`, text: 'You requested to share media. Waiting for stranger...', sender: 'system', timestamp: new Date().toISOString() }]);
  };

  const skipChat = () => {
    socket?.emit('leave-chat');
    setPartnerUserId(null);
    startSearching();
  };

  const stopChat = () => {
    if (state === 'direct-chat') {
      setState('friends');
    } else {
      socket?.emit('leave-chat');
      setState('landing');
    }
    setMessages([]);
    setPartnerUserId(null);
    setSelectedFriend(null);
  };

  const handleAddFriend = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!partnerUserId) {
      setMessages((prev) => [...prev, { id: `system-no-auth-${Date.now()}`, text: 'This stranger is not logged in and cannot be added as a friend.', sender: 'system', timestamp: new Date().toISOString() }]);
      return;
    }
    
    if (requests.some(r => r.fromId === partnerUserId)) {
      handleAcceptFriendRequest(partnerUserId);
    } else {
      socket?.emit('send-friend-request');
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
    socket?.emit('message-reaction', { messageId, emoji });
  };

  const handleAcceptFriendRequest = (fromId: string) => {
    socket?.emit('accept-friend-request', fromId);
  };

  const handleDeclineFriendRequest = (fromId: string) => {
    socket?.emit('decline-friend-request', fromId);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFriends([]);
    setRequests([]);
    // Clear stored token
    localStorage.removeItem('anon_chat_token');
    if (socket) {
      (socket.auth as any).token = undefined;
    }
    // Emit authenticate with null to clear user on server without disconnecting
    socket?.emit('authenticate', null);
  };

  const handleAuthSuccess = (userData: User, token: string) => {
    setUser(userData);
    fetchFriends();
    // Store token for socket reconnection
    localStorage.setItem('anon_chat_token', token);
    // Update socket auth so reconnections use the new token
    if (socket) {
      (socket.auth as any).token = token;
    }
    // Authenticate existing socket instead of disconnecting
    socket?.emit('authenticate', token);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {state === 'landing' && (
          <LandingView 
            onlineCount={onlineCount} 
            user={user}
            friends={friends}
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
            messages={messages}
            inputText={inputText}
            isPartnerTyping={isPartnerTyping}
            partnerAlias={state === 'direct-chat' ? selectedFriend?.username || 'Friend' : partnerAlias}
            partnerColor={state === 'direct-chat' ? selectedFriend?.avatarColor || 'indigo' : partnerColor}
            mediaAllowed={state === 'direct-chat' ? true : mediaAllowed}
            mediaRequested={mediaRequested}
            partnerRequestedMedia={partnerRequestedMedia}
            gameState={gameState}
            user={user}
            partnerUserId={state === 'direct-chat' ? selectedFriend?.id || null : partnerUserId}
            friends={friends}
            requests={requests}
            isDirectChat={state === 'direct-chat'}
            onSendMessage={sendMessage}
            onInputChange={handleInputChange}
            onFileSelect={handleFileSelect}
            onVideoSelect={handleVideoSelect}
            onRequestMedia={requestMediaPermission}
            onSkipChat={skipChat}
            onStopChat={stopChat}
            onImageClick={(src, id) => {
              setSelectedImage(src);
              if (id) handleMessageView(id);
            }}
            onGameInvite={handleGameInvite}
            onGameMove={handleGameMove}
            onGameCancel={handleGameCancel}
            onGameAccept={handleGameAccept}
            onAddFriend={handleAddFriend}
            onAcceptFriend={handleAcceptFriendRequest}
            onDeclineFriend={handleDeclineFriendRequest}
            onReaction={handleReaction}
            onDoodleDraw={handleDoodleDraw}
            onDoodleClear={handleDoodleClear}
            fileInputRef={fileInputRef}
            videoInputRef={videoInputRef}
            messagesEndRef={messagesEndRef}
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
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                <UserPlus className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">New Friend Request</h4>
                <p className="text-xs text-zinc-400 truncate">{pendingFriendRequest.fromUsername} wants to be friends!</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  handleAcceptFriendRequest(pendingFriendRequest.fromId);
                  setPendingFriendRequest(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  handleDeclineFriendRequest(pendingFriendRequest.fromId);
                  setPendingFriendRequest(null);
                }}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer"
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
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
