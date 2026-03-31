import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Users, LogIn, LogOut, User as UserIcon, ChevronRight } from 'lucide-react';
import { User, Friend } from '../types';

interface LandingViewProps {
  onlineCount: number;
  user: User | null;
  friends: Friend[];
  totalUnreadCount: number;
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
  totalUnreadCount,
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
        <div className="flex items-center gap-2 text-purple-300 text-xs sm:text-sm font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span>{onlineCount > 0 ? `${onlineCount} online` : 'Online'}</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenFriends}
                className="relative flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800/70 text-purple-200 hover:text-purple-100 rounded-full text-xs font-bold border border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                <Users className="w-4 h-4" />
                Friends
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] leading-[18px] text-center font-black shadow-lg">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-purple-500/30">
                <button
                  onClick={onOpenProfile}
                  className={`w-8 h-8 rounded-lg bg-${user.avatarColor}-900/50 flex items-center justify-center border border-${user.avatarColor}-500/30 hover:bg-${user.avatarColor}-900/70 transition-all cursor-pointer shadow-sm`}
                >
                  <UserIcon className={`w-4 h-4 text-${user.avatarColor}-400`} />
                </button>
                <button onClick={onLogout} className="p-2 text-slate-400 hover:text-pink-400 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/40 to-pink-600/40 hover:from-purple-600/60 hover:to-pink-600/60 text-purple-200 hover:text-purple-100 rounded-full text-xs font-bold border border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-3xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500/30 animate-float shadow-xl">
        <MessageSquare className="w-12 h-12 text-purple-300" />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-4 sm:mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
        AnonChat
      </h1>
      <p className="text-slate-300 text-base sm:text-lg md:text-xl max-w-md mb-8 sm:mb-12 leading-relaxed">
        Talk to strangers. Make friends. <br />
        <span className="text-slate-400 text-sm">No signup required. Login to save the good vibes. ✨</span>
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 w-full max-w-xs sm:max-w-none">
        <button
          onClick={onStartSearching}
          className="group relative px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white rounded-full font-bold text-base sm:text-lg transition-all hover:scale-105 hover:shadow-2xl active:scale-95 shadow-xl shadow-purple-500/30 cursor-pointer"
        >
          Find Someone Cool ✨
          <div className="absolute inset-0 rounded-full bg-white/30 opacity-0 group-hover:animate-ping pointer-events-none" />
        </button>

        {user && (
          <button
            onClick={onOpenFriends}
            className="relative px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full font-bold text-base sm:text-lg border-2 border-cyan-500/30 hover:border-cyan-400/50 transition-all hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Users className="w-5 h-5 group-hover:animate-bounce-subtle" />
            Your Circle
            {totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-pink-500 text-white text-[10px] leading-[20px] text-center font-black animate-bounce-subtle shadow-lg">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {user && friends.length > 0 && (
        <div className="w-full max-w-md mx-auto mt-4 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Recent Vibes ✨</h3>
            <button onClick={onOpenFriends} className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 hover:text-pink-300 transition-colors cursor-pointer">
              See All
            </button>
          </div>
          <div className="space-y-2">
            {friends.slice(0, 3).map((friend) => (
              <button
                key={friend.id}
                onClick={() => onStartChat(friend)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-purple-500/20 hover:border-purple-400/40 rounded-2xl transition-all hover:scale-[1.02] group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl bg-${friend.avatarColor}-900/50 flex items-center justify-center border border-${friend.avatarColor}-500/30 shadow-sm`}>
                  <UserIcon className={`w-5 h-5 text-${friend.avatarColor}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200 truncate">{friend.username}</span>
                    {friend.isOnline && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />}
                    {(friend.unreadCount || 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] leading-[18px] text-center font-black shadow-sm">
                        {(friend.unreadCount || 0) > 99 ? '99+' : friend.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {friend.lastMessage || (friend.isOnline ? 'Online' : 'Offline')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 sm:mt-16 flex items-center gap-2 text-purple-400 text-xs sm:text-sm opacity-0 pointer-events-none">
        {/* Hidden because moved to top bar */}
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{onlineCount > 0 ? `${onlineCount} users online` : 'Real-time connections active'}</span>
      </div>
    </motion.div>
  );
}
