/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, SkipForward, UserPlus, Gamepad2, Trophy, Palette, ArrowLeft, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { User as UserType, Friend, FriendRequest, GameType } from '../types';

interface ChatHeaderProps {
  partnerAlias: string;
  partnerColor: string;
  isPartnerOnline: boolean;
  isDirectChat: boolean;
  user: UserType | null;
  partnerUserId: string | null;
  friends: Friend[];
  requests: FriendRequest[];
  onGameInvite: (type: GameType) => void;
  onSkipChat: () => void;
  onStopChat: () => void;
  onAddFriend: () => void;
  onOpenAuth?: () => void;
}

export function ChatHeader({
  partnerAlias,
  partnerColor,
  isPartnerOnline,
  isDirectChat,
  user,
  partnerUserId,
  friends,
  requests,
  onGameInvite,
  onSkipChat,
  onStopChat,
  onAddFriend,
  onOpenAuth
}: ChatHeaderProps) {
  const [showGameMenu, setShowGameMenu] = useState(false);

  return (
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
  );
}
