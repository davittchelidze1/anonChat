import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface WaitingViewProps {
  onStopChat: () => void;
}

export function WaitingView({ onStopChat }: WaitingViewProps) {
  return (
    <motion.div
      key="waiting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
    >
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative" />
      </div>
      <h2 className="text-3xl font-bold mb-4">Finding someone...</h2>
      <p className="text-zinc-400 mb-8">This usually takes a few seconds.</p>
      <button
        onClick={onStopChat}
        className="px-6 py-2 rounded-full border border-zinc-800 hover:bg-zinc-900 transition-colors text-zinc-400 cursor-pointer"
      >
        Cancel
      </button>
    </motion.div>
  );
}
