import { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Target, Award, Flame, Zap, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ProgressBar } from './ProgressBar';
import { ChallengesPanel } from './ChallengesPanel';
import { ThemeSelector } from './ThemeSelector';
import type { UserProgress, Challenge } from '../types';

// Mock user progress
const mockProgress: UserProgress = {
  streak: 5,
  longestStreak: 12,
  xp: 450,
  level: 4,
  lastStudyDate: new Date().toISOString(),
  unlockedThemes: ['default', 'midnight'],
  challenges: []
};

// Mock challenges
const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'Speed Learner',
    description: 'Study 10 cards in under 5 minutes',
    target: 10,
    current: 7,
    completed: false,
    reward: { xp: 50, type: 'xp' }
  },
  {
    id: '2',
    title: 'Perfect Week',
    description: 'Maintain a 7-day study streak',
    target: 7,
    current: 5,
    completed: false,
    reward: { xp: 100, type: 'theme', value: 'aurora' }
  },
  {
    id: '3',
    title: 'Knowledge Master',
    description: 'Get 100% accuracy on any deck',
    target: 1,
    current: 1,
    completed: true,
    reward: { xp: 75, type: 'badge' }
  },
];

export function StudyView() {
  const [currentTheme, setCurrentTheme] = useState('default');

  const stats = {
    totalCards: 47,
    cardsStudiedToday: 23,
    currentStreak: 7,
    longestStreak: 14,
    averageAccuracy: 82,
    totalDecks: 5,
  };

  const recentActivity = [
    { date: 'Today', cards: 23, accuracy: 85 },
    { date: 'Yesterday', cards: 18, accuracy: 79 },
    { date: 'Oct 28', cards: 31, accuracy: 88 },
    { date: 'Oct 27', cards: 15, accuracy: 76 },
    { date: 'Oct 26', cards: 27, accuracy: 83 },
  ];

  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <motion.div 
          className="mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-neutral-900">Study Dashboard</h1>
            </div>
            <ThemeSelector
              currentTheme={currentTheme}
              onSelectTheme={setCurrentTheme}
              userStreak={mockProgress.streak}
              userLevel={mockProgress.level}
            />
          </div>
          <p className="text-neutral-600 ml-[56px] text-lg">
            Track your progress and build better study habits
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <ProgressBar progress={mockProgress} />
        </motion.div>

        {/* Active Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-neutral-700" />
            <h2 className="text-neutral-900">Active Challenges</h2>
          </div>
          <ChallengesPanel challenges={mockChallenges} />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <motion.div 
            className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-3xl text-neutral-900">{stats.cardsStudiedToday}</p>
                  <p className="text-sm text-neutral-600 mt-1">Cards Today</p>
                </div>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">Goal: 30 cards</p>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl text-neutral-900">{stats.currentStreak}</p>
                <p className="text-sm text-neutral-600 mt-1">Day Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Longest: {stats.longestStreak} days</span>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl text-neutral-900">{stats.averageAccuracy}%</p>
                <p className="text-sm text-neutral-600 mt-1">Accuracy</p>
              </div>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.averageAccuracy}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-2">+3% from last week</p>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div 
          className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-neutral-900 mb-5 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </h2>
          <div className="space-y-1">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-center justify-between py-4 px-4 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center">
                    <span className="text-sm text-neutral-700">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-neutral-900">{activity.date}</p>
                    <p className="text-sm text-neutral-600">{activity.cards} cards studied</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                    activity.accuracy >= 85 ? 'bg-green-50 text-green-700' :
                    activity.accuracy >= 75 ? 'bg-blue-50 text-blue-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-sm">{activity.accuracy}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div 
          className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-neutral-900 mb-5 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🔥', title: 'Week Warrior', desc: '7 day streak', color: 'from-orange-500 to-red-500' },
              { emoji: '📚', title: 'Card Collector', desc: '50+ cards', color: 'from-blue-500 to-purple-500' },
              { emoji: '🎯', title: 'Perfect Score', desc: '100% on a deck', color: 'from-green-500 to-emerald-500' },
              { emoji: '⚡', title: 'Speed Learner', desc: '30 cards in a day', color: 'from-yellow-500 to-amber-500' },
            ].map((achievement, index) => (
              <motion.div
                key={index}
                className="relative group cursor-pointer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center p-5 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl border border-neutral-200 group-hover:border-neutral-300 transition-all">
                  <div className="text-4xl mb-3">{achievement.emoji}</div>
                  <p className="text-sm text-neutral-900 mb-1">{achievement.title}</p>
                  <p className="text-xs text-neutral-600">{achievement.desc}</p>
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${achievement.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
