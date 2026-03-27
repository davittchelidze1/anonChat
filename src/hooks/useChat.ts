/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Message, Friend, User } from '../types';
import { MessageService } from '../services/messageService';
import { SOCKET_EVENTS } from '../events';
import { MEDIA_CONSTRAINTS } from '../constants';
import { fileToBase64, isValidFileSize, isValidVideoDuration } from '../utils/helpers';

export interface ChatState {
  messages: Message[];
  inputText: string;
  isPartnerTyping: boolean;
  partnerAlias: string;
  partnerColor: string;
  partnerUserId: string | null;
  mediaAllowed: boolean;
  mediaRequested: boolean;
  partnerRequestedMedia: boolean;
}

export function useChat(socket: Socket | null, user: User | null, selectedFriend: Friend | null, isDirectChat: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerAlias, setPartnerAlias] = useState('Stranger');
  const [partnerColor, setPartnerColor] = useState('indigo');
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [mediaAllowed, setMediaAllowed] = useState(false);
  const [mediaRequested, setMediaRequested] = useState(false);
  const [partnerRequestedMedia, setPartnerRequestedMedia] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Subscribe to direct messages from Firebase
  useEffect(() => {
    if (isDirectChat && user && selectedFriend) {
      const unsubscribe = MessageService.subscribeToDirectMessages(
        user.id,
        selectedFriend.id,
        setMessages
      );

      // Store unsubscribe function globally for cleanup
      (window as any).currentChatUnsubscribe = unsubscribe;

      return () => {
        unsubscribe();
        (window as any).currentChatUnsubscribe = null;
      };
    }
  }, [isDirectChat, user?.id, selectedFriend?.id]);

  const sendMessage = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!inputText.trim() || !socket) return;

    if (isDirectChat && selectedFriend && user) {
      const text = inputText;
      setInputText('');
      socket.emit(SOCKET_EVENTS.TYPING, false);

      try {
        await MessageService.sendDirectMessage(user.id, selectedFriend.id, text);
      } catch (err) {
        console.error('Failed to send message', err);
      }
      return;
    }

    const newMessage = MessageService.createLocalMessage(inputText);
    setMessages((prev) => [...prev, newMessage]);
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { id: newMessage.id, text: inputText });
    setInputText('');
    socket.emit(SOCKET_EVENTS.TYPING, false);
  }, [inputText, socket, isDirectChat, selectedFriend, user]);

  const handleInputChange = useCallback((e: { target: { value: string } }) => {
    setInputText(e.target.value);
    socket?.emit(SOCKET_EVENTS.TYPING, e.target.value.length > 0);
  }, [socket]);

  const handleFileSelect = useCallback(async (e: { target: { files?: FileList | null } }) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    if (!isValidFileSize(file, MEDIA_CONSTRAINTS.MAX_FILE_SIZE)) {
      alert(`File too large (max ${MEDIA_CONSTRAINTS.MAX_FILE_SIZE / 1024}KB)`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);

      if (isDirectChat && selectedFriend && user) {
        await MessageService.sendDirectImage(
          user.id,
          selectedFriend.id,
          base64,
          MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT
        );
      } else {
        const newMessage = MessageService.createLocalMessage('', {
          image: base64,
          maxViews: MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT,
        });
        setMessages((prev) => [...prev, newMessage]);
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
          id: newMessage.id,
          text: '',
          image: base64,
          maxViews: MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT,
        });
      }
    } catch (err) {
      console.error('Failed to send image', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [socket, isDirectChat, selectedFriend, user]);

  const handleVideoSelect = useCallback(async (e: { target: { files?: FileList | null } }) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    if (!isValidFileSize(file, MEDIA_CONSTRAINTS.MAX_FILE_SIZE)) {
      alert(`Video too large (max ${MEDIA_CONSTRAINTS.MAX_FILE_SIZE / 1024}KB)`);
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);

      if (!isValidVideoDuration(video, MEDIA_CONSTRAINTS.MAX_VIDEO_DURATION)) {
        alert('Video must be 10 seconds or less');
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      try {
        const base64 = await fileToBase64(file);

        if (isDirectChat && selectedFriend && user) {
          await MessageService.sendDirectVideo(
            user.id,
            selectedFriend.id,
            base64,
            MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT
          );
        } else {
          const newMessage = MessageService.createLocalMessage('', {
            video: base64,
            maxViews: MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT,
          });
          setMessages((prev) => [...prev, newMessage]);
          socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
            id: newMessage.id,
            text: '',
            video: base64,
            maxViews: MEDIA_CONSTRAINTS.MAX_VIEWS_DEFAULT,
          });
        }
      } catch (err) {
        console.error('Failed to send video', err);
      } finally {
        if (videoInputRef.current) videoInputRef.current.value = '';
      }
    };
    video.src = URL.createObjectURL(file);
  }, [socket, isDirectChat, selectedFriend, user]);

  const handleMessageView = useCallback(async (messageId: string) => {
    if (isDirectChat && selectedFriend && user) {
      try {
        await MessageService.updateMessageView(user.id, selectedFriend.id, messageId);
      } catch (err) {
        console.error('Failed to update message view', err);
      }
      return;
    }

    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        const newCount = (m.viewCount || 0) + 1;
        const isViewed = m.maxViews ? newCount >= m.maxViews : false;
        if (!m.isViewed) {
          socket?.emit(SOCKET_EVENTS.MESSAGE_VIEWED, { messageId, partnerId: null });
        }
        return { ...m, viewCount: newCount, isViewed };
      }
      return m;
    }));
  }, [socket, isDirectChat, selectedFriend, user]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
    socket?.emit(SOCKET_EVENTS.MESSAGE_REACTION, { messageId, emoji });
  }, [socket]);

  const requestMediaPermission = useCallback(() => {
    if (mediaAllowed || mediaRequested) return;
    socket?.emit(SOCKET_EVENTS.REQUEST_MEDIA_PERMISSION);
    setMediaRequested(true);
    setMessages((prev) => [...prev, {
      id: `system-req-${Date.now()}`,
      text: 'You requested to share media. Waiting for stranger...',
      sender: 'system',
      timestamp: new Date().toISOString()
    }]);
  }, [socket, mediaAllowed, mediaRequested]);

  return {
    // State
    messages,
    inputText,
    isPartnerTyping,
    partnerAlias,
    partnerColor,
    partnerUserId,
    mediaAllowed,
    mediaRequested,
    partnerRequestedMedia,
    messagesEndRef,
    fileInputRef,
    videoInputRef,

    // Setters (for socket event handlers)
    setMessages,
    setIsPartnerTyping,
    setPartnerAlias,
    setPartnerColor,
    setPartnerUserId,
    setMediaAllowed,
    setMediaRequested,
    setPartnerRequestedMedia,

    // Actions
    sendMessage,
    handleInputChange,
    handleFileSelect,
    handleVideoSelect,
    handleMessageView,
    handleReaction,
    requestMediaPermission,
  };
}
