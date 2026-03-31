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
      className="flex flex-col h-screen max-w-2xl mx-auto border-x-2 border-purple-100"
    >
      <header className="p-6 border-b-2 border-purple-100 flex items-center gap-4 bg-white/80 backdrop-blur-lg shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-purple-100 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Your Circle 💫</h2>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {requests.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Incoming Requests ✨</h3>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.fromId} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 rounded-2xl hover:border-purple-300 transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-200 flex items-center justify-center border border-purple-300 shadow-sm">
                      <User className="w-5 h-5 text-purple-700" />
                    </div>
                    <span className="font-bold text-slate-800">{req.fromUsername}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAcceptRequest(req.fromId)}
                      className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeclineRequest(req.fromId)}
                      className="p-2 bg-white hover:bg-pink-100 text-slate-600 hover:text-pink-700 rounded-xl transition-all hover:scale-110 active:scale-95 cursor-pointer border-2 border-slate-200"
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
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">All Friends 👥</h3>
          {friends.length === 0 ? (
            <div className="text-center py-16 px-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-2 border-purple-200 shadow-sm">
              <UserPlus className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-bounce-subtle" />
              <p className="text-slate-800 text-base font-bold mb-2">Your circle is empty 💫</p>
              <p className="text-slate-600 text-sm">Chat with someone cool & add them as a friend</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => onStartChat(friend)}
                  className="flex items-center justify-between p-4 bg-white border-2 border-purple-100 rounded-2xl hover:bg-purple-50 hover:border-purple-300 hover:scale-[1.02] transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-${friend.avatarColor}-100 flex items-center justify-center border-2 border-${friend.avatarColor}-300 shadow-sm`}>
                      <User className={`w-6 h-6 text-${friend.avatarColor}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate text-slate-800">{friend.username}</span>
                        {friend.isOnline && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/50" />}
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
                  </div>
                  <button className="p-3 bg-purple-100 group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-pink-500 rounded-xl transition-all text-purple-600 group-hover:text-white cursor-pointer shadow-sm">
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
