import { motion } from 'motion/react';
import { Zap, Award, TrendingUp } from 'lucide-react';
import type { UserProgress } from '../types';

interface ProgressBarProps {
  progress: UserProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const xpForNextLevel = progress.level * 100;
  const xpProgress = (progress.xp % xpForNextLevel) / xpForNextLevel * 100;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-neutral-900">Level {progress.level}</h3>
              <div className="flex items-center gap-1 bg-purple-100 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3 text-purple-600" />
                <span className="text-xs text-purple-700">{progress.xp} XP</span>
              </div>
            </div>
            <p className="text-sm text-neutral-600">{xpForNextLevel - (progress.xp % xpForNextLevel)} XP to level {progress.level + 1}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1 text-orange-600">
              <span className="text-2xl">🔥</span>
              <span className="text-xl">{progress.streak}</span>
            </div>
            <p className="text-xs text-neutral-600">day streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-purple-600">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xl">{progress.longestStreak}</span>
            </div>
            <p className="text-xs text-neutral-600">best streak</p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-white/80 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-neutral-700 drop-shadow-sm">
            {Math.round(xpProgress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
