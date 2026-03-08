import { useState, useEffect } from 'react';
import { User } from '../types';
import { getDeviceId } from '../utils/device';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Try anonymous device login
        const deviceId = getDeviceId();
        const loginRes = await fetch('/api/auth/device-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId })
        });
        
        if (loginRes.ok) {
          const data = await loginRes.json();
          setUser(data.user);
          // Store token for socket authentication
          localStorage.setItem('anon_chat_token', data.token);
        }
      }
    } catch (e) {
      console.error("Auth error:", e);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, fetchUser, setUser };
};
