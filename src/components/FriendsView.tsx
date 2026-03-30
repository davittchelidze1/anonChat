import React from 'react';
import { motion } from 'motion/react';
import { User, MessageSquare, ArrowLeft, UserPlus, Check, X } from 'lucide-react';
import { Friend, FriendRequest } from '../types';

interface FriendsViewProps {
  friends: Friend[];
  requests: FriendRequest[];
  onBack: () => void;
  onAcceptRequest: (fromId: string) => void;
  onDeclineRequest: (fromId: string) => void;
  onStartChat: (friend: Friend) => void;
}

export function FriendsView({ friends, requests, onBack, onAcceptRequest, onDeclineRequest, onStartChat }: FriendsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-screen max-w-2xl mx-auto bg-zinc-950 border-x border-white/5"
    >
      <header className="p-6 border-b border-white/5 flex items-center gap-4 bg-zinc-950/80 backdrop-blur-lg">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Your Circle</h2>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {requests.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Incoming Requests</h3>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.fromId} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600/5 to-emerald-600/5 border border-indigo-500/20 rounded-2xl hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                      <User className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="font-bold">{req.fromUsername}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAcceptRequest(req.fromId)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeclineRequest(req.fromId)}
                      className="p-2 bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">All Friends</h3>
          {friends.length === 0 ? (
            <div className="text-center py-16 px-6 bg-zinc-900/50 rounded-3xl border border-white/5">
              <UserPlus className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-bounce-subtle" />
              <p className="text-zinc-400 text-base font-semibold mb-2">Your circle is empty</p>
              <p className="text-zinc-600 text-sm">Chat with someone cool & add them as a friend</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => onStartChat(friend)}
                  className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-900 hover:border-white/10 hover:scale-[1.02] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-${friend.avatarColor}-500/10 flex items-center justify-center border border-${friend.avatarColor}-500/20`}>
                      <User className={`w-6 h-6 text-${friend.avatarColor}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{friend.username}</span>
                        {friend.isOnline && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        {(friend.unreadCount || 0) > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] text-center font-black">
                            {(friend.unreadCount || 0) > 99 ? '99+' : friend.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {friend.lastMessage || (friend.isOnline ? 'Online' : 'Offline')}
                      </p>
                    </div>
                  </div>
                  <button className="p-3 bg-white/5 group-hover:bg-indigo-600/20 rounded-xl transition-all text-zinc-500 group-hover:text-indigo-400 cursor-pointer">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </motion.div>
  );
}
