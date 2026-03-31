/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Video, Smile, SkipForward } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { cn } from '../lib/utils';

interface MessageInputProps {
  inputText: string;
  mediaAllowed: boolean;
  mediaRequested: boolean;
  partnerRequestedMedia: boolean;
  isDirectChat: boolean;
  onSendMessage: (e?: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestMedia: () => void;
  onSkipChat: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MessageInput({
  inputText,
  mediaAllowed,
  mediaRequested,
  partnerRequestedMedia,
  isDirectChat,
  onSendMessage,
  onInputChange,
  onRequestMedia,
  onSkipChat,
  fileInputRef,
  videoInputRef,
  onFileSelect,
  onVideoSelect
}: MessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const event = {
      target: { value: inputText + emojiData.emoji }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
    setShowEmojiPicker(false);
  };

  return (
    <footer className="p-4 sm:p-8 bg-slate-900/60 backdrop-blur-3xl border-t-2 border-purple-500/20 pb-safe shadow-lg">
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
                className="p-2 text-slate-400 hover:text-purple-400 transition-colors hover:bg-purple-500/20 rounded-full cursor-pointer emoji-trigger"
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
                    className="absolute bottom-full left-0 mb-4 emoji-picker-container shadow-2xl rounded-2xl overflow-hidden border-2 border-purple-500/30"
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
                    className="p-2 text-slate-400 hover:text-purple-400 transition-colors hover:bg-purple-500/20 rounded-full cursor-pointer"
                    title="Send Image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-purple-400 transition-colors hover:bg-purple-500/20 rounded-full cursor-pointer"
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
                      ? "text-slate-600 cursor-not-allowed"
                      : partnerRequestedMedia
                        ? "text-emerald-400 hover:bg-emerald-500/20 animate-pulse cursor-pointer"
                        : "text-slate-400 hover:text-purple-400 hover:bg-purple-500/20 cursor-pointer"
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
                "w-full bg-slate-800/50 border-2 border-purple-500/30 rounded-[2rem] pr-14 sm:pr-16 py-4 sm:py-5 text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-slate-500 shadow-sm text-slate-100",
                mediaAllowed ? "pl-32 sm:pl-36" : partnerRequestedMedia && !mediaRequested ? "pl-36 sm:pl-40" : "pl-20 sm:pl-24"
              )}
            />
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 sm:p-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:bg-slate-700 disabled:text-slate-600 text-white rounded-full transition-all active:scale-90 shadow-lg shadow-purple-500/30 cursor-pointer"
              >
                <Send className="w-4 h-4 sm:w-5 h-5" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 px-2 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/30 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-300 uppercase tracking-widest">Secure</span>
            </div>
            <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">End-to-end encrypted</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {!isDirectChat && (
              <button
                onClick={() => confirm('Report this user for inappropriate behavior?') && onSkipChat()}
                className="text-[8px] sm:text-[9px] font-black text-slate-400 hover:text-pink-400 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Report
              </button>
            )}
            {!isDirectChat && (
              <button
                onClick={onSkipChat}
                className="group flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-slate-400 hover:text-purple-400 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Skip Stranger
                <SkipForward className="w-2.5 h-2.5 sm:w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
