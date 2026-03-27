import { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDeviceId } from '../utils/device';

const USERNAME_SETUP_PENDING_KEY = 'anon_chat_username_setup_pending';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const fetchUser = async () => {
    if (!auth.currentUser) return null;
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return null;
    const nextUser = userDoc.data() as User;
    setUser(nextUser);
    return nextUser;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        // Listen to user profile changes
        const unsubSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            const isUsernameSetupPending = localStorage.getItem(USERNAME_SETUP_PENDING_KEY) === '1';
            if (isUsernameSetupPending) {
              // Auth modal is currently completing first-time profile setup.
              return;
            }

            // Only create profile for explicitly signed-in users (not anonymous)
            if (!firebaseUser.isAnonymous && !firebaseUser.email?.endsWith('@fallback.anonchat.local')) {
              const deviceId = getDeviceId();
              const username = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `User-${Math.floor(Math.random() * 10000)}`;
              const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
              const avatarColor = colors[Math.floor(Math.random() * colors.length)];

              const newUser: User = {
                id: firebaseUser.uid,
                username,
                avatarColor,
                friends: [],
                friendRequests: [],
                deviceId,
                createdAt: new Date().toISOString(),
                authType: 'registered'
              };

              try {
                await setDoc(userDocRef, newUser);
                setUser(newUser);
              } catch (e) {
                console.error("Failed to create user profile", e);
              }
            }
          }
        });

        setIsAuthReady(true);
        return () => unsubSnapshot();
      } else {
        // No Firebase user - set auth ready for guest mode
        setUser(null);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, isAuthReady, setUser, fetchUser };
};
