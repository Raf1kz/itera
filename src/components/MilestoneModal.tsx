import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: {
    title: string;
    description: string;
    reward: string;
    icon: string;
  };
}

export function MilestoneModal({ isOpen, onClose, milestone }: MilestoneModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-neutral-200 overflow-hidden">
          {/* Animated Background */}
          <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-8 text-white">
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="text-6xl mb-4"
              >
                {milestone.icon}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl mb-2">Milestone Unlocked!</h2>
                <p className="text-white/90">{milestone.title}</p>
              </motion.div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-neutral-700 text-center mb-4">
              {milestone.description}
            </p>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 mb-6">
              <div className="flex items-center justify-center gap-2 text-purple-700">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">{milestone.reward}</span>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-neutral-900 hover:bg-neutral-800 h-11"
            >
              Awesome!
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
