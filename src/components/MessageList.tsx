/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut } from 'lucide-react';
import { Message, Friend, FriendRequest } from '../types';
import { cn } from '../lib/utils';
import { REACTION_EMOJIS } from '../constants';

interface MessageListProps {
  messages: Message[];
  isPartnerTyping: boolean;
  partnerColor: string;
  partnerUserId: string | null;
  requests: FriendRequest[];
  onImageClick: (src: string, id?: string) => void;
  onAcceptFriend: (fromId: string) => void;
  onDeclineFriend: (fromId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({
  messages,
  isPartnerTyping,
  partnerColor,
  partnerUserId,
  requests,
  onImageClick,
  onAcceptFriend,
  onDeclineFriend,
  onReaction,
  messagesEndRef
}: MessageListProps) {
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.reaction-menu')) {
        setActiveReactionId(null);
      }
    };

    if (activeReactionId) {
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
                          {REACTION_EMOJIS.map(emoji => (
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
                                  <User className="w-6 h-6 text-white" />
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
                                  <User className="w-6 h-6 text-white" />
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
  );
}
