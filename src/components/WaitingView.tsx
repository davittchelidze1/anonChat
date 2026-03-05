import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Users, X } from 'lucide-react';

interface WaitingViewProps {
  onStopChat: () => void;
  onlineCount: number;
}

export function WaitingView({ onStopChat, onlineCount }: WaitingViewProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="waiting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center relative overflow-hidden"
    >
      {/* Background Radar Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[500px] h-[500px] border border-indigo-500/30 rounded-full animate-ping absolute" style={{ animationDuration: '3s' }} />
        <div className="w-[300px] h-[300px] border border-indigo-500/30 rounded-full animate-ping absolute" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        <div className="w-[100px] h-[100px] border border-indigo-500/30 rounded-full animate-ping absolute" style={{ animationDuration: '3s', animationDelay: '2s' }} />
      </div>

      <div className="relative mb-8 z-10">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-indigo-500/50 shadow-xl shadow-indigo-500/20 relative">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-2 tracking-tight">Finding a partner{dots}</h2>
      <p className="text-zinc-400 mb-8 max-w-xs mx-auto">
        Scanning {onlineCount > 0 ? `${onlineCount} online users` : 'network'} for a random match.
      </p>

      <button
        onClick={onStopChat}
        className="group flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-500/30 rounded-full transition-all text-zinc-400 hover:text-rose-400 cursor-pointer"
      >
        <X className="w-4 h-4" />
        <span className="font-medium">Cancel Search</span>
      </button>

      <div className="absolute bottom-8 text-xs text-zinc-600 font-mono">
        ESTIMATED WAIT: &lt; 5s
      </div>
    </motion.div>
  );
}
