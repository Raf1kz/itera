import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Check, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DeckCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalCards: number;
    knownCards: number;
    accuracy: number;
    timeSpent?: string;
  };
}

export function DeckCompletionModal({ isOpen, onClose, stats }: DeckCompletionModalProps) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Confetti */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
                  }}
                  initial={{ y: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    y: window.innerHeight + 100,
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    ease: 'linear',
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
          )}

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg pointer-events-auto"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-[2rem] blur-3xl" />

                <div className="relative bg-white/95 backdrop-blur-xl border border-neutral-200/60 rounded-[2rem] p-6 sm:p-10 shadow-2xl">
                  {/* Trophy Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      delay: 0.2
                    }}
                    className="mx-auto mb-6 relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full blur-2xl" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 mx-auto">
                      <Trophy className="w-12 h-12 text-white" strokeWidth={2} />
                    </div>
                  </motion.div>

                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-3"
                  >
                    <h2 className="text-neutral-900 mb-2">{t('deckCompletion.title')}</h2>
                    <p className="text-neutral-600 text-lg">
                      {t('deckCompletion.subtitle')}
                    </p>
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 mt-8"
                  >
                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200/60">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/30">
                        <Target className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-2xl text-neutral-900 mb-1">{stats.totalCards}</div>
                      <div className="text-xs text-neutral-600">{t('deckCompletion.totalCards')}</div>
                    </div>

                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200/60">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/30">
                        <Check className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-2xl text-neutral-900 mb-1">{stats.knownCards}</div>
                      <div className="text-xs text-neutral-600">{t('deckCompletion.mastered')}</div>
                    </div>

                    <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200/60">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-purple-500/30">
                        <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-2xl text-neutral-900 mb-1">{stats.accuracy}%</div>
                      <div className="text-xs text-neutral-600">{t('deckCompletion.accuracy')}</div>
                    </div>
                  </motion.div>

                  {/* Achievement Badge */}
                  {stats.accuracy >= 80 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-amber-700">
                        <span className="text-2xl">🏆</span>
                        <span className="text-sm">{t('deckCompletion.highAchiever')} - {stats.accuracy}% {t('deckCompletion.accuracyBadge')}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      onClick={onClose}
                      className="w-full bg-gradient-to-br from-neutral-900 to-neutral-700 hover:from-neutral-800 hover:to-neutral-600 h-14 shadow-xl shadow-neutral-900/20 hover:shadow-2xl hover:shadow-neutral-900/30 transition-all relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>{t('deckCompletion.backToFlashcards')}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </motion.div>

                  {/* Quick tip */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-6 text-center"
                  >
                    <p className="text-xs text-neutral-500">
                      💡 {t('deckCompletion.tip')}
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
