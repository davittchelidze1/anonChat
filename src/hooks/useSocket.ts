import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Get or create a persistent session ID using cryptographically secure random
    let sessionId = localStorage.getItem('anon_chat_session_id');
    if (!sessionId) {
      // Use crypto.randomUUID() for secure session ID generation
      sessionId = crypto.randomUUID();
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
