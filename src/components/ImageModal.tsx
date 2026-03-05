import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ImageModalProps {
  selectedImage: string | null;
  onClose: () => void;
}

export function ImageModal({ selectedImage, onClose }: ImageModalProps) {
  return (
    <AnimatePresence>
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[110] p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedImage.startsWith('data:video/') ? (
              <video 
                src={selectedImage} 
                controls 
                autoPlay 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={selectedImage}
                alt="Full size"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
