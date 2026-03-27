import React from 'react';
import { motion } from 'motion/react';
import { Message, GameState, GameType, User as UserType, Friend, FriendRequest } from '../types';
import { MiniGames } from './MiniGames';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
  messages: Message[];
  inputText: string;
  isPartnerTyping: boolean;
  partnerAlias: string;
  partnerColor: string;
  mediaAllowed: boolean;
  mediaRequested: boolean;
  partnerRequestedMedia: boolean;
  gameState: GameState | null;
  user: UserType | null;
  partnerUserId: string | null;
  friends: Friend[];
  requests: FriendRequest[];
  onSendMessage: (e?: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestMedia: () => void;
  onSkipChat: () => void;
  onStopChat: () => void;
  onImageClick: (src: string, id?: string) => void;
  onGameInvite: (type: GameType) => void;
  onGameMove: (move: number | string) => void;
  onGameCancel: () => void;
  onGameAccept: (type: GameType) => void;
  onAddFriend: () => void;
  onAcceptFriend: (fromId: string) => void;
  onDeclineFriend: (fromId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDoodleDraw: (stroke: { x: number; y: number; color: string; isStart: boolean }) => void;
  onDoodleClear: () => void;
  isDirectChat?: boolean;
  onOpenAuth?: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatView({
  messages,
  inputText,
  isPartnerTyping,
  partnerAlias,
  partnerColor,
  mediaAllowed,
  mediaRequested,
  partnerRequestedMedia,
  gameState,
  user,
  partnerUserId,
  friends,
  requests,
  onSendMessage,
  onInputChange,
  onFileSelect,
  onVideoSelect,
  onRequestMedia,
  onSkipChat,
  onStopChat,
  onImageClick,
  onGameInvite,
  onGameMove,
  onGameCancel,
  onGameAccept,
  onAddFriend,
  onAcceptFriend,
  onDeclineFriend,
  onReaction,
  onDoodleDraw,
  onDoodleClear,
  isDirectChat = false,
  onOpenAuth,
  fileInputRef,
  videoInputRef,
  messagesEndRef
}: ChatViewProps) {
  const isPartnerOnline = isDirectChat
    ? friends.find(f => f.id === partnerUserId)?.isOnline
    : true; // Anonymous partners are always "online" while matched

  return (
    <motion.div
      key="chatting"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex flex-col h-[100dvh] max-w-7xl mx-auto border-x border-white/5 bg-zinc-950 shadow-2xl overflow-hidden"
    >
      <MiniGames
        gameState={gameState}
        onMove={onGameMove}
        onCancel={onGameCancel}
        onAccept={onGameAccept}
        onInvite={onGameInvite}
        onDoodleDraw={onDoodleDraw}
        onDoodleClear={onDoodleClear}
      />

      <ChatHeader
        partnerAlias={partnerAlias}
        partnerColor={partnerColor}
        isPartnerOnline={isPartnerOnline}
        isDirectChat={isDirectChat}
        user={user}
        partnerUserId={partnerUserId}
        friends={friends}
        requests={requests}
        onGameInvite={onGameInvite}
        onSkipChat={onSkipChat}
        onStopChat={onStopChat}
        onAddFriend={onAddFriend}
        onOpenAuth={onOpenAuth}
      />

      <MessageList
        messages={messages}
        isPartnerTyping={isPartnerTyping}
        partnerColor={partnerColor}
        partnerUserId={partnerUserId}
        requests={requests}
        onImageClick={onImageClick}
        onAcceptFriend={onAcceptFriend}
        onDeclineFriend={onDeclineFriend}
        onReaction={onReaction}
        messagesEndRef={messagesEndRef}
      />

      <MessageInput
        inputText={inputText}
        mediaAllowed={mediaAllowed}
        mediaRequested={mediaRequested}
        partnerRequestedMedia={partnerRequestedMedia}
        isDirectChat={isDirectChat}
        onSendMessage={onSendMessage}
        onInputChange={onInputChange}
        onRequestMedia={onRequestMedia}
        onSkipChat={onSkipChat}
        fileInputRef={fileInputRef}
        videoInputRef={videoInputRef}
        onFileSelect={onFileSelect}
        onVideoSelect={onVideoSelect}
      />
    </motion.div>
  );
}
