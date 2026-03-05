import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Shield, Calendar, LogOut, Settings } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onLogout: () => void;
  friendCount: number;
}

export function ProfileModal({ isOpen, onClose, user, onLogout, friendCount }: ProfileModalProps) {
  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className={`h-32 bg-gradient-to-br from-${user.avatarColor}-600 to-${user.avatarColor}-900 relative`}>
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-6">
                <div className={`w-32 h-32 rounded-3xl bg-zinc-900 p-2 shadow-2xl`}>
                  <div className={`w-full h-full rounded-2xl bg-${user.avatarColor}-500/20 flex items-center justify-center border border-${user.avatarColor}-500/30`}>
                    <User className={`w-16 h-16 text-${user.avatarColor}-400`} />
                  </div>
                </div>
                <div className="absolute bottom-2 left-24 w-6 h-6 rounded-full bg-emerald-500 border-4 border-zinc-900" />
              </div>

              <div className="space-y-1 mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white">{user.username}</h2>
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  Verified Member
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Friends</p>
                  <p className="text-2xl font-bold text-white">{friendCount}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                  <p className="text-lg font-bold text-emerald-400">Online</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold">Logout</span>
                  </div>
                  <X className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
