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
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 border-b-2 border-purple-100 bg-white/80 backdrop-blur-2xl z-20 sticky top-0 shadow-sm">
      <div className="flex items-center gap-3 sm:gap-5">
        {isDirectChat && (
          <button
            onClick={onStopChat}
            className="p-2 hover:bg-purple-100 rounded-full transition-colors cursor-pointer mr-1"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <div className="relative">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-${partnerColor}-100 flex items-center justify-center border-2 border-${partnerColor}-300 rotate-3 transition-transform hover:rotate-0 shadow-md`}>
            <User className={`w-5 h-5 sm:w-6 sm:h-6 text-${partnerColor}-600`} />
          </div>
          {isPartnerOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 border-2 sm:border-4 border-white rounded-full shadow-lg shadow-emerald-400/50" />
          )}
        </div>
        <div>
          <h2 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight truncate max-w-[100px] sm:max-w-none">{partnerAlias}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-purple-600">
              {isDirectChat ? 'Friend' : 'Stranger'}
            </span>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span className={cn(
              "text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-black",
              isPartnerOnline ? "text-emerald-600" : "text-slate-500"
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
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-purple-700 border-2 border-purple-300 cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span className="hidden xs:inline">Login</span>
          </button>
        )}
        {!isDirectChat && (!partnerUserId || !friends.some(f => f.id === partnerUserId)) && (
          <button
            onClick={onAddFriend}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-100 to-cyan-100 hover:from-emerald-200 hover:to-cyan-200 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-700 border-2 border-emerald-300 cursor-pointer shadow-sm"
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
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-purple-700 border-2 border-purple-300 cursor-pointer shadow-sm"
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
                className="absolute right-0 mt-2 w-48 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <button
                  onClick={() => { onGameInvite('tictactoe'); setShowGameMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-purple-600" />
                  Tic-Tac-Toe
                </button>
                <button
                  onClick={() => { onGameInvite('rps'); setShowGameMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  Rock Paper Scissors
                </button>
                <button
                  onClick={() => { onGameInvite('doodle'); setShowGameMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-pink-700 hover:bg-pink-50 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-pink-600" />
                  Shared Doodle
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isDirectChat && (
          <button
            onClick={onSkipChat}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white hover:bg-slate-100 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-800 border-2 border-slate-200 cursor-pointer shadow-sm"
          >
            <SkipForward className="w-3.5 h-3.5 sm:w-4 h-4" />
            <span className="hidden sm:inline">Next</span>
          </button>
        )}
        {!isDirectChat && (
          <button
            onClick={onStopChat}
            className="p-2 sm:p-2.5 bg-gradient-to-r from-pink-100 to-rose-100 hover:from-pink-200 hover:to-rose-200 rounded-xl transition-all text-pink-700 border-2 border-pink-300 cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4 sm:w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
