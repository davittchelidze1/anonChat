import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, X, Sparkles } from 'lucide-react';

interface WaitingViewProps {
  onStopChat: () => void;
  onlineCount: number;
}

const PLAYFUL_MESSAGES = [
  'Finding your next best friend',
  'Searching for cool humans',
  'Connecting you to someone awesome',
  'Looking for interesting conversations',
  'Scanning the digital universe',
  'Finding someone to vibe with',
];

export function WaitingView({ onStopChat, onlineCount }: WaitingViewProps) {
  const [dots, setDots] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % PLAYFUL_MESSAGES.length);
    }, 3000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(messageInterval);
    };
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

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles className="absolute top-1/4 left-1/4 w-4 h-4 text-indigo-400/40 animate-pulse" />
        <Sparkles className="absolute top-1/3 right-1/4 w-3 h-3 text-emerald-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
        <Sparkles className="absolute bottom-1/3 left-1/3 w-3 h-3 text-rose-400/40 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative mb-8 z-10">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-indigo-500/50 shadow-2xl shadow-indigo-500/30 relative">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
      </div>

      <motion.h2
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-3xl font-bold mb-2 tracking-tight"
      >
        {PLAYFUL_MESSAGES[messageIndex]}{dots}
      </motion.h2>
      <p className="text-zinc-400 mb-8 max-w-xs mx-auto">
        {onlineCount > 0 ? `Scanning ${onlineCount} people online` : 'This should only take a moment'}
      </p>

      <button
        onClick={onStopChat}
        className="group flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-500/30 rounded-full transition-all text-zinc-400 hover:text-rose-400 hover:shadow-lg cursor-pointer"
      >
        <X className="w-4 h-4" />
        <span className="font-medium">Changed My Mind</span>
      </button>

      <div className="absolute bottom-8 text-xs text-zinc-600 font-mono animate-pulse-slow">
        usually takes &lt; 5 seconds
      </div>
    </motion.div>
  );
}
