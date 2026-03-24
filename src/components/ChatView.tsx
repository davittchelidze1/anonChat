import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, LogOut, SkipForward, Image as ImageIcon, Video, Trophy, Gamepad2, UserPlus, Palette, ArrowLeft, Smile, LogIn } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Message, GameState, GameType, User as UserType, Friend, FriendRequest } from '../types';
import { cn } from '../lib/utils';
import { MiniGames } from './MiniGames';

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
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isPartnerOnline = isDirectChat 
    ? friends.find(f => f.id === partnerUserId)?.isOnline 
    : true; // Anonymous partners are always "online" while matched
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const emojis = ['❤️', '😂', '👍', '😮', '🔥', '🙏'];

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const event = {
      target: { value: inputText + emojiData.emoji }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
    setShowEmojiPicker(false);
  };

  const handleLongPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveReactionId(id);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.reaction-menu')) {
        setActiveReactionId(null);
      }
      if (!target.closest('.emoji-picker-container') && !target.closest('.emoji-trigger')) {
        setShowEmojiPicker(false);
      }
    };

    if (activeReactionId) {
      // Small delay to prevent catching the current interaction
      const timer = setTimeout(() => {
        window.addEventListener('click', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('click', handleClickOutside);
      };
    }
  }, [activeReactionId]);

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

      {/* Chat Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl z-20 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-5">
          {isDirectChat && (
            <button 
              onClick={onStopChat}
              className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
          )}
          <div className="relative">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-${partnerColor}-500/10 flex items-center justify-center border border-${partnerColor}-500/20 rotate-3 transition-transform hover:rotate-0`}>
              <User className={`w-5 h-5 sm:w-6 sm:h-6 text-${partnerColor}-400`} />
            </div>
            {isPartnerOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 border-2 sm:border-4 border-black rounded-full" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white tracking-tight truncate max-w-[100px] sm:max-w-none">{partnerAlias}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500">
                {isDirectChat ? 'Friend' : 'Stranger'}
              </span>
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className={cn(
                "text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-black",
                isPartnerOnline ? "text-emerald-500" : "text-zinc-500"
              )}>
                {isPartnerOnline ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isDirectChat && !user && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden xs:inline">Login</span>
            </button>
          )}
          {!isDirectChat && (!partnerUserId || !friends.some(f => f.id === partnerUserId)) && (
            <button
              onClick={onAddFriend}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden sm:inline">
                {partnerUserId && requests.some(r => r.fromId === partnerUserId) ? 'Accept Request' : 'Add Friend'}
              </span>
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowGameMenu(!showGameMenu)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/20 cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden sm:inline">Play</span>
            </button>
            
            <AnimatePresence>
              {showGameMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <button
                    onClick={() => { onGameInvite('tictactoe'); setShowGameMenu(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-indigo-400" />
                    Tic-Tac-Toe
                  </button>
                  <button
                    onClick={() => { onGameInvite('rps'); setShowGameMenu(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    Rock Paper Scissors
                  </button>
                  <button
                    onClick={() => { onGameInvite('doodle'); setShowGameMenu(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Palette className="w-4 h-4 text-rose-400" />
                    Shared Doodle
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isDirectChat && (
            <button
              onClick={onSkipChat}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/5 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="hidden sm:inline">Next</span>
            </button>
          )}
          {!isDirectChat && (
            <button
              onClick={onStopChat}
              className="p-2 sm:p-2.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all text-rose-400 border border-rose-500/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-6 scrollbar-hide bg-zinc-950">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isMe = msg.sender === 'me';
              const isSystem = msg.sender === 'system';
              const showAvatar = !isMe && !isSystem && (i === 0 || messages[i - 1].sender !== 'partner');
              
              if (isSystem) {
                const isFriendRequest = msg.text.includes('sent you a friend request!');
                const fromPartner = partnerUserId && requests.some(r => r.fromId === partnerUserId);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={msg.id || i} 
                    className="flex flex-col items-center gap-2 my-4"
                  >
                    <span className="px-4 py-1.5 bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-full text-[11px] font-medium text-zinc-500 shadow-sm">
                      {msg.text}
                    </span>
                    {isFriendRequest && fromPartner && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAcceptFriend(partnerUserId)}
                          className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onDeclineFriend(partnerUserId)}
                          className="px-4 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              }

              const hasMedia = msg.image || msg.video;
              const isViewed = msg.isViewed;

              return (
                <motion.div
                  initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  key={msg.id || i}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-3`}
                >
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${showAvatar ? `bg-${partnerColor}-500/10 ring-1 ring-${partnerColor}-500/30` : 'opacity-0'}`}>
                      {showAvatar && <User className={`w-4 h-4 text-${partnerColor}-400`} />}
                    </div>
                  )}
                  
                  <div className={`group relative max-w-[80%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!isSystem) setActiveReactionId(msg.id);
                      }}
                      onMouseDown={() => !isSystem && handleLongPressStart(msg.id)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      onTouchStart={() => !isSystem && handleLongPressStart(msg.id)}
                      onTouchEnd={handleLongPressEnd}
                      className={cn(
                        "p-3 sm:p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all relative cursor-pointer",
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-zinc-800 text-zinc-100 rounded-bl-sm",
                        hasMedia && msg.maxViews && "border-2 border-indigo-500/30",
                        activeReactionId === msg.id && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-950 z-50"
                      )}
                    >
                      {/* Reaction Menu */}
                      <AnimatePresence>
                        {activeReactionId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className={cn(
                              "absolute z-50 bg-zinc-900 border border-white/10 rounded-full p-1 shadow-2xl flex gap-1 reaction-menu",
                              isMe ? "right-0 -top-12" : "left-0 -top-12"
                            )}
                          >
                            {emojis.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReaction(msg.id, emoji);
                                  setActiveReactionId(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-lg cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {hasMedia && isViewed ? (
                        <div className="flex items-center gap-3 py-2 px-4 bg-black/20 rounded-xl text-zinc-500 italic text-sm">
                          <LogOut className="w-4 h-4 opacity-50" />
                          Media expired
                        </div>
                      ) : (
                        <>
                          {msg.image && (
                            <div className="mb-3 overflow-hidden rounded-xl bg-black/20 relative group/media">
                              <img 
                                src={msg.image} 
                                alt="Shared content" 
                                className={cn(
                                  "max-w-full w-full h-auto object-cover transition-all duration-300",
                                  msg.maxViews && !isMe ? "blur-xl scale-110 cursor-pointer" : "cursor-zoom-in hover:scale-105"
                                )}
                                onClick={() => onImageClick(msg.image || '', msg.id)}
                              />
                              {msg.maxViews && !isMe && (
                                <div 
                                  onClick={() => onImageClick(msg.image || '', msg.id)}
                                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer hover:bg-black/20 transition-all"
                                >
                                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-2">
                                    <ImageIcon className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                    View Twice
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {msg.video && (
                            <div className="mb-3 overflow-hidden rounded-xl bg-black/20 relative">
                              {msg.maxViews && !isMe ? (
                                <div 
                                  onClick={() => onImageClick(msg.video || '', msg.id)}
                                  className="aspect-video flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer hover:bg-black/20 transition-all"
                                >
                                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-2">
                                    <Video className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                    View Twice
                                  </span>
                                </div>
                              ) : (
                                <video 
                                  src={msg.video} 
                                  controls
                                  onPlay={() => !isMe && onImageClick('', msg.id)}
                                  className="max-w-full w-full h-auto rounded-xl"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}
                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                      
                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={cn(
                          "flex flex-wrap gap-1 mt-2",
                          isMe ? "justify-end" : "justify-start"
                        )}>
                          {Object.entries(msg.reactions).map(([emoji, count]) => (
                            <div 
                              key={emoji}
                              className="bg-black/20 backdrop-blur-sm border border-white/5 rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold"
                            >
                              <span>{emoji}</span>
                              <span className="text-zinc-400">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`mt-1.5 flex items-center gap-1.5 opacity-60 text-[10px] font-medium text-zinc-500 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {hasMedia && msg.maxViews && (
                        <span className="flex items-center gap-1 text-indigo-400 font-bold uppercase tracking-tighter">
                          <LogOut className="w-3 h-3" />
                          {isViewed ? 'Opened' : 'View Twice'}
                        </span>
                      )}
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isPartnerTyping && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl bg-${partnerColor}-500/10 border border-${partnerColor}-500/20 flex items-center justify-center shadow-lg`}>
                <User className={`w-5 h-5 text-${partnerColor}-400/50`} />
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 px-5 py-3 rounded-3xl rounded-bl-none shadow-xl">
                <div className="flex gap-1.5">
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 bg-zinc-600 rounded-full" />
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-zinc-600 rounded-full" />
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-zinc-600 rounded-full" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-8 bg-black/60 backdrop-blur-3xl border-t border-white/5 pb-safe">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={onSendMessage}
            className="relative flex items-center gap-2 sm:gap-4"
          >
            <div className="relative flex-1 group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelect}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={onVideoSelect}
                accept="video/*"
                className="hidden"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors hover:bg-white/5 rounded-full cursor-pointer emoji-trigger"
                  title="Add Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-4 emoji-picker-container shadow-2xl rounded-2xl overflow-hidden border border-white/10"
                    >
                      <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        theme={Theme.DARK}
                        lazyLoadEmojis={true}
                        width={300}
                        height={400}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {mediaAllowed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors hover:bg-white/5 rounded-full cursor-pointer"
                      title="Send Image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors hover:bg-white/5 rounded-full cursor-pointer"
                      title="Send Video"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestMedia}
                    disabled={mediaRequested}
                    className={cn(
                       "p-2 transition-colors rounded-full flex items-center gap-2",
                      mediaRequested 
                        ? "text-zinc-600 cursor-not-allowed" 
                        : partnerRequestedMedia 
                          ? "text-emerald-500 hover:bg-emerald-500/10 animate-pulse cursor-pointer" 
                          : "text-zinc-500 hover:text-indigo-400 hover:bg-white/5 cursor-pointer"
                    )}
                    title={mediaRequested ? "Waiting for partner..." : "Request to share media"}
                  >
                    <ImageIcon className="w-5 h-5" />
                    {partnerRequestedMedia && !mediaRequested && (
                      <span className="text-[10px] font-bold uppercase tracking-wider">Accept</span>
                    )}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={inputText}
                onChange={onInputChange}
                placeholder="Type your message..."
                className={cn(
                  "w-full bg-zinc-900/40 border border-white/10 rounded-[2rem] pr-14 sm:pr-16 py-4 sm:py-5 text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all placeholder:text-zinc-700 shadow-inner",
                  mediaAllowed ? "pl-32 sm:pl-36" : partnerRequestedMedia && !mediaRequested ? "pl-36 sm:pl-40" : "pl-20 sm:pl-24"
                )}
              />
              <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 sm:p-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-full transition-all active:scale-90 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Send className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
          
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 px-2 sm:px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-widest">Secure</span>
              </div>
              <span className="text-[8px] sm:text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">End-to-end encrypted</span>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
              {!isDirectChat && (
                <button 
                  onClick={() => confirm('Report this user for inappropriate behavior?') && onSkipChat()}
                  className="text-[8px] sm:text-[9px] font-black text-zinc-700 hover:text-rose-500 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Report
                </button>
              )}
              {!isDirectChat && (
                <button 
                  onClick={onSkipChat}
                  className="group flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Skip Stranger
                  <SkipForward className="w-2.5 h-2.5 sm:w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
