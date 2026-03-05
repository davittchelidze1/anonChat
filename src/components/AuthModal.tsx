import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        onSuccess(data.user, data.token);
        onClose();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-4">
                <User className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="text-zinc-500 text-sm">
                {isLogin ? 'Login to see your friends' : 'Join to save your connections'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-xs text-center font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Login' : 'Register')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
