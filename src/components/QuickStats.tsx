import { motion } from 'motion/react';
import { Target, Zap, Award } from 'lucide-react';

interface QuickStatsProps {
  cardsToday: number;
  streak: number;
  xp: number;
  level: number;
}

export function QuickStats({ cardsToday, streak, xp, level }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <motion.div
        className="bg-white border border-neutral-200 rounded-xl p-3 hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xl text-neutral-900">{cardsToday}</span>
        </div>
        <p className="text-xs text-neutral-600">Cards today</p>
      </motion.div>

      <motion.div
        className="bg-white border border-neutral-200 rounded-xl p-3 hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
            <span className="text-sm">🔥</span>
          </div>
          <span className="text-xl text-neutral-900">{streak}</span>
        </div>
        <p className="text-xs text-neutral-600">Day streak</p>
      </motion.div>

      <motion.div
        className="bg-white border border-neutral-200 rounded-xl p-3 hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-xl text-neutral-900">{xp}</span>
        </div>
        <p className="text-xs text-neutral-600">Total XP</p>
      </motion.div>

      <motion.div
        className="bg-white border border-neutral-200 rounded-xl p-3 hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <Award className="w-3.5 h-3.5 text-green-600" />
          </div>
          <span className="text-xl text-neutral-900">{level}</span>
        </div>
        <p className="text-xs text-neutral-600">Level</p>
      </motion.div>
    </div>
  );
}
