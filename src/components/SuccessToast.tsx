import { motion, AnimatePresence } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useEffect } from 'react';

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export function SuccessToast({ message, isVisible, onClose }: SuccessToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl p-4 pr-12 min-w-[300px] relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-neutral-900">{message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
