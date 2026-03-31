import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, X, Sparkles } from 'lucide-react';

interface WaitingViewProps {
  onStopChat: () => void;
  onlineCount: number;
}

const PLAYFUL_MESSAGES = [
  'Finding your next best friend ✨',
  'Searching for cool humans 🚀',
  'Connecting you to someone awesome 🌟',
  'Looking for interesting conversations 💬',
  'Scanning the digital universe 🌈',
  'Finding someone to vibe with 🎉',
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-[500px] h-[500px] border-2 border-purple-400/40 rounded-full animate-ping absolute" style={{ animationDuration: '3s' }} />
        <div className="w-[300px] h-[300px] border-2 border-pink-400/40 rounded-full animate-ping absolute" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        <div className="w-[100px] h-[100px] border-2 border-cyan-400/40 rounded-full animate-ping absolute" style={{ animationDuration: '3s', animationDelay: '2s' }} />
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles className="absolute top-1/4 left-1/4 w-6 h-6 text-purple-400 animate-pulse" />
        <Sparkles className="absolute top-1/3 right-1/4 w-5 h-5 text-pink-400 animate-pulse" style={{ animationDelay: '1s' }} />
        <Sparkles className="absolute bottom-1/3 left-1/3 w-5 h-5 text-cyan-400 animate-pulse" style={{ animationDelay: '2s' }} />
        <Sparkles className="absolute top-1/2 right-1/3 w-4 h-4 text-amber-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative mb-8 z-10">
        <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full animate-pulse" />
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full flex items-center justify-center border-4 border-purple-400/40 shadow-2xl shadow-purple-500/20 relative">
          <Loader2 className="w-12 h-12 text-purple-300 animate-spin" />
        </div>
      </div>

      <motion.h2
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-3xl font-bold mb-2 tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
      >
        {PLAYFUL_MESSAGES[messageIndex]}{dots}
      </motion.h2>
      <p className="text-slate-300 mb-8 max-w-xs mx-auto font-medium">
        {onlineCount > 0 ? `Scanning ${onlineCount} people online 🔍` : 'This should only take a moment ⏱️'}
      </p>

      <button
        onClick={onStopChat}
        className="group flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-800/70 border-2 border-slate-600/30 hover:border-pink-500/40 rounded-full transition-all text-slate-300 hover:text-pink-300 hover:shadow-lg cursor-pointer"
      >
        <X className="w-4 h-4" />
        <span className="font-semibold">Changed My Mind</span>
      </button>

      <div className="absolute bottom-8 text-xs text-purple-400 font-semibold animate-pulse-slow">
        usually takes &lt; 5 seconds ⚡
      </div>
    </motion.div>
  );
}
