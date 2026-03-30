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
            className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border-2 border-purple-200 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className={`h-32 bg-gradient-to-br from-${user.avatarColor}-400 to-${user.avatarColor}-600 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/30 hover:bg-white/50 text-white rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-6">
                <div className={`w-32 h-32 rounded-3xl bg-white p-2 shadow-2xl`}>
                  <div className={`w-full h-full rounded-2xl bg-${user.avatarColor}-100 flex items-center justify-center border-2 border-${user.avatarColor}-300`}>
                    <User className={`w-16 h-16 text-${user.avatarColor}-600`} />
                  </div>
                </div>
                <div className="absolute bottom-2 left-24 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-lg shadow-emerald-400/50" />
              </div>

              <div className="space-y-1 mb-8">
                {!isEditingUsername ? (
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">{user.username}</h2>
                    <button
                      onClick={() => {
                        setUsernameInput(user.username || '');
                        setUsernameError('');
                        setIsEditingUsername(true);
                      }}
                      className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-2 border-purple-300 hover:from-purple-200 hover:to-pink-200 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
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
                      className="w-full py-3 px-4 rounded-2xl bg-white text-slate-800 border-2 border-purple-200 outline-none focus:border-purple-500 hover:border-purple-300 transition-all shadow-sm"
                    />
                    {usernameError && (
                      <p className="text-xs text-pink-600 bg-pink-100 py-1 px-3 rounded-lg">{usernameError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveUsername}
                        disabled={isSavingUsername}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                      >
                        {isSavingUsername ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setUsernameInput(buildRandomUsername(user.username || 'anon'))}
                        disabled={isSavingUsername}
                        className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-2 border-slate-200 shadow-sm"
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
                        className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-2 border-slate-200 shadow-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-slate-600 text-sm flex items-center gap-2">
                  <Shield className="w-3 h-3 text-purple-600" />
                  Verified Member
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border-2 border-purple-200 hover:border-purple-300 transition-all shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-700 mb-1">Friends</p>
                  <p className="text-2xl font-bold text-slate-800">{friendCount}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-2xl border-2 border-emerald-200 hover:border-emerald-300 transition-all shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Status</p>
                  <p className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400/50" />
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
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-pink-100 to-rose-100 hover:from-pink-200 hover:to-rose-200 text-pink-700 rounded-2xl border-2 border-pink-300 hover:border-pink-400 transition-all hover:scale-[1.02] cursor-pointer group shadow-sm"
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
