import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Target, Zap } from 'lucide-react';

interface StudySessionProps {
  onComplete: (sessionData: { cardsStudied: number; timeSpent: number; accuracy: number }) => void;
}

export function StudySession({ onComplete }: StudySessionProps) {
  const [sessionActive, setSessionActive] = useState(false);
  const [cardsStudied, _setCardsStudied] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => {
        setTimeElapsed(t => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [sessionActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {sessionActive && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div className="bg-white border-2 border-neutral-900 rounded-2xl shadow-2xl p-4 min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-neutral-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Active Session
              </h4>
              <button
                onClick={() => {
                  setSessionActive(false);
                  onComplete({ cardsStudied, timeSpent: timeElapsed, accuracy: cardsStudied ? 1 : 0 });
                }}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                End
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Time
                </span>
                <span className="text-neutral-900 font-mono">{formatTime(timeElapsed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Cards
                </span>
                <span className="text-neutral-900">{cardsStudied}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-200">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Cards/min</span>
                <span className="text-neutral-900">
                  {timeElapsed > 0 ? (cardsStudied / (timeElapsed / 60)).toFixed(1) : '0.0'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
