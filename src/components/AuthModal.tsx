import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const token = await userCredential.user.getIdToken();
      
      if (userDoc.exists()) {
        onSuccess(userDoc.data() as UserType, token);
      } else {
        const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Generate a username from their Google name or email
        let username = userCredential.user.displayName || userCredential.user.email?.split('@')[0] || `User-${Math.floor(Math.random() * 10000)}`;
        
        const newUser: UserType = {
          id: userCredential.user.uid,
          username,
          avatarColor,
          friends: [],
          friendRequests: [],
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        onSuccess(newUser, token);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled');
      } else {
        setError('Failed to connect to Google');
      }
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
                Sign In to Add Friends
              </h3>
              <p className="text-zinc-500 text-sm">
                Keep chatting as a guest, or login with Google to save friends and conversations
              </p>
            </div>

            <div className="space-y-4">
              {error && (
                <p className="text-rose-500 text-xs text-center font-medium">{error}</p>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
