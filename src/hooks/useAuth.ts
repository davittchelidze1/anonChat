import { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDeviceId } from '../utils/device';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user profile changes
        const unsubSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else if (firebaseUser.isAnonymous || firebaseUser.email?.endsWith('@fallback.anonchat.local')) {
            // If anonymous and no profile, create a profile
            const deviceId = getDeviceId();
            const username = `Anon-${Math.floor(Math.random() * 10000)}`;
            const colors = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'fuchsia'];
            const avatarColor = colors[Math.floor(Math.random() * colors.length)];
            
            const newUser: User = {
              id: firebaseUser.uid,
              username,
              avatarColor,
              friends: [],
              friendRequests: [],
              deviceId,
              createdAt: new Date().toISOString()
            };
            
            try {
              await setDoc(userDocRef, newUser);
              setUser(newUser);
            } catch (e) {
              console.error("Failed to create anonymous profile", e);
            }
          }
        });

        setIsAuthReady(true);
        return () => unsubSnapshot();
      } else {
        setUser(null);
        // Try anonymous login
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          // Fallback: If Anonymous Auth is disabled, simulate it using Email/Password
          if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
            try {
              const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
              const storedEmail = localStorage.getItem('anon_email');
              const storedPassword = localStorage.getItem('anon_password');
              
              if (storedEmail && storedPassword) {
                await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
              } else {
                const randomId = Math.random().toString(36).substring(2, 15);
                const email = `anon_${randomId}@fallback.anonchat.local`;
                const password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                
                await createUserWithEmailAndPassword(auth, email, password);
                localStorage.setItem('anon_email', email);
                localStorage.setItem('anon_password', password);
              }
            } catch (fallbackError: any) {
              if (fallbackError.code !== 'auth/operation-not-allowed') {
                console.error("Fallback auth failed", fallbackError);
              }
            }
          } else {
            console.error("Anonymous auth failed", e);
          }
        }
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, isAuthReady, setUser };
};
