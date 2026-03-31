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

type AuthStep = 'signin' | 'username';

type PendingRegistration = {
  uid: string;
  token: string;
  avatarColor: string;
  email: string;
  displayName: string;
};

const USERNAME_SETUP_PENDING_KEY = 'anon_chat_username_setup_pending';

function sanitizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

function getEmailBasedName(email: string, displayName: string): string {
  const emailPrefix = email.split('@')[0] || '';
  const firstToken = emailPrefix.split(/[._-]/)[0] || displayName.split(' ')[0] || 'anon';
  const clean = sanitizeUsername(firstToken);
  return clean || 'anon';
}

function buildRandomUsername(baseName: string): string {
  const suffix = Math.floor(100 + Math.random() * 900);
  return sanitizeUsername(`${baseName}_${suffix}`);
}

function getAuthErrorMessage(err: unknown): string {
  const errorCode =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';

  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'Login cancelled.';
    case 'auth/popup-blocked':
      return 'Popup blocked by browser. Allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Login already in progress. Please try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Auth. Add this Render domain in Firebase Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Google. Check your connection and try again.';
    case 'permission-denied':
      return 'Google login succeeded, but Firestore denied profile access. Check Firestore rules.';
    default:
      return errorCode ? `Google sign-in failed (${errorCode}).` : 'Failed to connect to Google.';
  }
}

function getFirestoreWriteErrorMessage(err: unknown): string {
  const errorCode =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';

  switch (errorCode) {
    case 'permission-denied':
      return 'Could not save username: Firestore rules denied write access.';
    case 'unavailable':
      return 'Could not save username: Firestore is temporarily unavailable.';
    default:
      return errorCode
        ? `Could not save username (${errorCode}).`
        : 'Could not save username. Please try again.';
  }
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [quickUsername, setQuickUsername] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);

  const resetModalState = () => {
    setStep('signin');
    setError('');
    setUsernameInput('');
    setQuickUsername('');
    setPendingRegistration(null);
  };

  const handleClose = async () => {
    // If user started sign-in but hasn't finished username setup,
    // sign out to avoid a half-configured authenticated session.
    if (step === 'username') {
      try {
        await auth.signOut();
      } catch (closeError) {
        console.error('Error while cancelling signup flow:', closeError);
      }
    }

    localStorage.removeItem(USERNAME_SETUP_PENDING_KEY);
    resetModalState();
    onClose();
  };

  const finalizeNewUser = async (username: string) => {
    if (!pendingRegistration) {
      setError('Signup session expired. Please try again.');
      return;
    }

    const cleanUsername = sanitizeUsername(username);
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, underscore).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', pendingRegistration.uid);
      const userSnap = await getDoc(userRef);

      const finalUser: UserType = userSnap.exists()
        ? (userSnap.data() as UserType)
        : {
            id: pendingRegistration.uid,
            username: cleanUsername,
            avatarColor: pendingRegistration.avatarColor,
            friends: [],
            friendRequests: [],
            createdAt: new Date().toISOString(),
          };

      if (!userSnap.exists()) {
        await setDoc(userRef, finalUser);
      }

      localStorage.removeItem(USERNAME_SETUP_PENDING_KEY);
      onSuccess(finalUser, pendingRegistration.token);
      resetModalState();
      onClose();
    } catch (finalizeError) {
      console.error('Failed to finish profile setup:', finalizeError);
      setError(getFirestoreWriteErrorMessage(finalizeError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      localStorage.setItem(USERNAME_SETUP_PENDING_KEY, '1');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const token = await userCredential.user.getIdToken();

      if (userDoc.exists()) {
        localStorage.removeItem(USERNAME_SETUP_PENDING_KEY);
        onSuccess(userDoc.data() as UserType, token);
        resetModalState();
        onClose();
      } else {
        const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        const email = userCredential.user.email || '';
        const displayName = userCredential.user.displayName || '';
        const baseName = getEmailBasedName(email, displayName);
        const suggestedUsername = sanitizeUsername(baseName);
        const generatedQuickUsername = buildRandomUsername(baseName);

        setPendingRegistration({
          uid: userCredential.user.uid,
          token,
          avatarColor,
          email,
          displayName,
        });
        setUsernameInput(suggestedUsername);
        setQuickUsername(generatedQuickUsername);
        setStep('username');
      }
    } catch (err: any) {
      localStorage.removeItem(USERNAME_SETUP_PENDING_KEY);
      console.error('Google login error:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-purple-900/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border-2 border-purple-200 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
            
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-pink-600 hover:bg-pink-100 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center border-2 border-purple-300 mb-4 animate-float shadow-lg">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2 text-slate-800">
                {step === 'signin' ? 'Join the Party 🎉' : 'Pick Your Name ✨'}
              </h3>
              <p className="text-slate-600 text-sm">
                {step === 'signin'
                  ? 'Continue as a ghost, or sign in to save your friends & chats'
                  : 'Choose something memorable — or let us surprise you'}
              </p>
            </div>

            <div className="space-y-4">
              {error && (
                <p className="text-pink-600 text-xs text-center font-semibold bg-pink-100 py-2 px-4 rounded-xl border border-pink-300">{error}</p>
              )}

              {step === 'signin' ? (
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] shadow-lg border-2 border-slate-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </button>
              ) : (
                <>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(sanitizeUsername(e.target.value))}
                    placeholder="cool_username"
                    maxLength={24}
                    className="w-full py-3 px-4 rounded-2xl bg-white text-slate-800 border-2 border-purple-200 outline-none focus:border-purple-500 hover:border-purple-300 transition-all shadow-sm"
                  />

                  <button
                    onClick={() => finalizeNewUser(usernameInput)}
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoading ? 'Creating...' : 'Let\'s Go 🚀'}
                  </button>

                  <button
                    onClick={() => {
                      const refreshedRandom = buildRandomUsername(getEmailBasedName(
                        pendingRegistration?.email || '',
                        pendingRegistration?.displayName || ''
                      ));
                      setQuickUsername(refreshedRandom);
                      setUsernameInput(refreshedRandom);
                      finalizeNewUser(refreshedRandom);
                    }}
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-semibold border-2 border-slate-200 hover:border-purple-300 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isLoading ? 'Rolling dice... 🎲' : `Surprise me 🎲 (${quickUsername || 'generate'})`}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
