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
  onUpdateUsername: (username: string) => Promise<void>;
}

function sanitizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

function buildRandomUsername(base: string): string {
  const cleanedBase = sanitizeUsername(base) || 'anon';
  const suffix = Math.floor(100 + Math.random() * 900);
  return sanitizeUsername(`${cleanedBase}_${suffix}`);
}

export function ProfileModal({ isOpen, onClose, user, onLogout, friendCount, onUpdateUsername }: ProfileModalProps) {
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [usernameInput, setUsernameInput] = React.useState('');
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState('');

  React.useEffect(() => {
    if (isOpen && user) {
      setUsernameInput(user.username || '');
      setUsernameError('');
      setIsEditingUsername(false);
    }
  }, [isOpen, user?.username]);

  if (!user) return null;

  const saveUsername = async () => {
    const cleanUsername = sanitizeUsername(usernameInput);
    if (cleanUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError('');
    try {
      await onUpdateUsername(cleanUsername);
      setIsEditingUsername(false);
    } catch (err: any) {
      setUsernameError(err?.message || 'Failed to update username.');
    } finally {
      setIsSavingUsername(false);
    }
  };

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
            <div className={`h-32 bg-gradient-to-br from-${user.avatarColor}-600 to-${user.avatarColor}-900 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
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
                {!isEditingUsername ? (
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight text-white">{user.username}</h2>
                    <button
                      onClick={() => {
                        setUsernameInput(user.username || '');
                        setUsernameError('');
                        setIsEditingUsername(true);
                      }}
                      className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(sanitizeUsername(e.target.value))}
                      placeholder="cool_username"
                      maxLength={24}
                      className="w-full py-3 px-4 rounded-2xl bg-zinc-950 text-zinc-100 border border-white/10 outline-none focus:border-indigo-500/50 hover:border-white/20 transition-all"
                    />
                    {usernameError && (
                      <p className="text-xs text-rose-400">{usernameError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveUsername}
                        disabled={isSavingUsername}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingUsername ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setUsernameInput(buildRandomUsername(user.username || 'anon'))}
                        disabled={isSavingUsername}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Surprise
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingUsername(false);
                          setUsernameError('');
                          setUsernameInput(user.username || '');
                        }}
                        disabled={isSavingUsername}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  Verified Member
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Friends</p>
                  <p className="text-2xl font-bold text-white">{friendCount}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] rounded-2xl border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                  <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/20 hover:border-rose-500/30 transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold">Sign Out</span>
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
