import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Users, LogIn, LogOut, User as UserIcon, ChevronRight } from 'lucide-react';
import { User, Friend } from '../types';

interface LandingViewProps {
  onlineCount: number;
  user: User | null;
  friends: Friend[];
  onStartSearching: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenFriends: () => void;
  onOpenProfile: () => void;
  onStartChat: (friend: Friend) => void;
}

export function LandingView({ 
  onlineCount, 
  user, 
  friends,
  onStartSearching, 
  onOpenAuth, 
  onLogout, 
  onOpenFriends, 
  onOpenProfile,
  onStartChat
}: LandingViewProps) {
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center relative"
    >
      {/* Top Bar */}
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{onlineCount > 0 ? `${onlineCount} online` : 'Real-time'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenFriends}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold border border-zinc-800 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Friends
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <button 
                  onClick={onOpenProfile}
                  className={`w-8 h-8 rounded-lg bg-${user.avatarColor}-500/10 flex items-center justify-center border border-${user.avatarColor}-500/20 hover:bg-${user.avatarColor}-500/20 transition-all cursor-pointer`}
                >
                  <UserIcon className={`w-4 h-4 text-${user.avatarColor}-400`} />
                </button>
                <button onClick={onLogout} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Login / Register
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-3xl bg-indigo-600/20 border border-indigo-500/30">
        <MessageSquare className="w-12 h-12 text-indigo-500" />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-4 sm:mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
        AnonChat
      </h1>
      <p className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-md mb-8 sm:mb-12">
        Meet someone new. Chat anonymously. Make friends. No login required.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 w-full max-w-xs sm:max-w-none">
        <button
          onClick={onStartSearching}
          className="group relative px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold text-base sm:text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20 cursor-pointer"
        >
          Start Searching
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:animate-ping pointer-events-none" />
        </button>
        
        {user && (
          <button
            onClick={onOpenFriends}
            className="px-6 sm:px-8 py-3.5 sm:py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-semibold text-base sm:text-lg border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Users className="w-5 h-5 text-indigo-400" />
            My Friends
          </button>
        )}
      </div>

      {user && friends.length > 0 && (
        <div className="w-full max-w-md mx-auto mt-4 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Recent Chats</h3>
            <button onClick={onOpenFriends} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {friends.slice(0, 3).map((friend) => (
              <button
                key={friend.id}
                onClick={() => onStartChat(friend)}
                className="w-full flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 rounded-2xl transition-all group cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-${friend.avatarColor}-500/10 flex items-center justify-center border border-${friend.avatarColor}-500/20`}>
                  <UserIcon className={`w-5 h-5 text-${friend.avatarColor}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{friend.username}</span>
                    {friend.isOnline && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {friend.lastMessage || (friend.isOnline ? 'Online' : 'Offline')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 sm:mt-16 flex items-center gap-2 text-zinc-500 text-xs sm:text-sm opacity-0 pointer-events-none">
        {/* Hidden because moved to top bar */}
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>{onlineCount > 0 ? `${onlineCount} users online` : 'Real-time connections active'}</span>
      </div>
    </motion.div>
  );
}
