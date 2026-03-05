import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Get or create a persistent session ID
    let sessionId = localStorage.getItem('anon_chat_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('anon_chat_session_id', sessionId);
    }

    const token = localStorage.getItem('anon_chat_token');

    // Initialize socket with session ID and token for automatic auth on connect/reconnect
    const newSocket = io({
      auth: { 
        sessionId,
        token: token || undefined
      },
      withCredentials: true
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
};
