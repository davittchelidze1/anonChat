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
        <div className="flex items-center gap-2 text-purple-600 text-xs sm:text-sm font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span>{onlineCount > 0 ? `${onlineCount} online` : 'Online'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenFriends}
                className="relative flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 rounded-full text-xs font-bold border border-purple-200 hover:border-purple-300 transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                <Users className="w-4 h-4" />
                Friends
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] leading-[18px] text-center font-black shadow-lg">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3 pl-3 border-l border-purple-200">
                <button
                  onClick={onOpenProfile}
                  className={`w-8 h-8 rounded-lg bg-${user.avatarColor}-100 flex items-center justify-center border border-${user.avatarColor}-300 hover:bg-${user.avatarColor}-200 transition-all cursor-pointer shadow-sm`}
                >
                  <UserIcon className={`w-4 h-4 text-${user.avatarColor}-600`} />
                </button>
                <button onClick={onLogout} className="p-2 text-slate-500 hover:text-pink-600 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 hover:text-purple-800 rounded-full text-xs font-bold border border-purple-300 hover:border-purple-400 transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-3xl bg-gradient-to-br from-purple-200 to-pink-200 border-2 border-purple-300 animate-float shadow-xl">
        <MessageSquare className="w-12 h-12 text-purple-600" />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-4 sm:mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
        AnonChat
      </h1>
      <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-md mb-8 sm:mb-12 leading-relaxed">
        Talk to strangers. Make friends. <br />
        <span className="text-slate-500 text-sm">No signup required. Login to save the good vibes. ✨</span>
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 w-full max-w-xs sm:max-w-none">
        <button
          onClick={onStartSearching}
          className="group relative px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white rounded-full font-bold text-base sm:text-lg transition-all hover:scale-105 hover:shadow-2xl active:scale-95 shadow-xl shadow-purple-500/40 cursor-pointer"
        >
          Find Someone Cool ✨
          <div className="absolute inset-0 rounded-full bg-white/30 opacity-0 group-hover:animate-ping pointer-events-none" />
        </button>
        
        {user && (
          <button
            onClick={onOpenFriends}
            className="relative px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full font-bold text-base sm:text-lg border-2 border-cyan-300 hover:border-cyan-400 transition-all hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/30"
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Recent Vibes ✨</h3>
            <button onClick={onOpenFriends} className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 hover:text-pink-700 transition-colors cursor-pointer">
              See All
            </button>
          </div>
          <div className="space-y-2">
            {friends.slice(0, 3).map((friend) => (
              <button
                key={friend.id}
                onClick={() => onStartChat(friend)}
                className="w-full flex items-center gap-3 p-3 bg-white/70 hover:bg-white border border-purple-100 hover:border-purple-300 rounded-2xl transition-all hover:scale-[1.02] group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl bg-${friend.avatarColor}-100 flex items-center justify-center border border-${friend.avatarColor}-300 shadow-sm`}>
                  <UserIcon className={`w-5 h-5 text-${friend.avatarColor}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 truncate">{friend.username}</span>
                    {friend.isOnline && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/50" />}
                    {(friend.unreadCount || 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] leading-[18px] text-center font-black shadow-sm">
                        {(friend.unreadCount || 0) > 99 ? '99+' : friend.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {friend.lastMessage || (friend.isOnline ? 'Online' : 'Offline')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 sm:mt-16 flex items-center gap-2 text-purple-500 text-xs sm:text-sm opacity-0 pointer-events-none">
        {/* Hidden because moved to top bar */}
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>{onlineCount > 0 ? `${onlineCount} users online` : 'Real-time connections active'}</span>
      </div>
    </motion.div>
  );
}
