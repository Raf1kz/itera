import { motion } from 'motion/react';
import { Target, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';
import type { Challenge } from '../types';

interface ChallengesPanelProps {
  challenges: Challenge[];
}

export function ChallengesPanel({ challenges }: ChallengesPanelProps) {
  return (
    <div className="space-y-3">
      {challenges.map((challenge, index) => (
        <motion.div
          key={challenge.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`
            relative overflow-hidden rounded-2xl border-2 p-4 transition-all
            ${challenge.completed
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
              : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-md'
            }
          `}
        >
          {challenge.completed && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl" />
          )}

          <div className="relative flex items-start gap-4">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg
              ${challenge.completed
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : 'bg-gradient-to-br from-neutral-900 to-neutral-700'
              }
            `}>
              {challenge.completed ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Target className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-neutral-900 mb-1">{challenge.title}</h4>
                  <p className="text-sm text-neutral-600">{challenge.description}</p>
                </div>
                {challenge.reward.type === 'theme' && !challenge.completed && (
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Theme</span>
                  </div>
                )}
              </div>

              {!challenge.completed && (
                <>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-neutral-600">Progress</span>
                      <span className="text-neutral-900">
                        {challenge.current}/{challenge.target}
                      </span>
                    </div>
                    <Progress 
                      value={(challenge.current / challenge.target) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs">
                      <Sparkles className="w-3 h-3" />
                      <span>+{challenge.reward.xp} XP</span>
                    </div>
                  </div>
                </>
              )}

              {challenge.completed && (
                <div className="mt-2 bg-white/80 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                  ✓ Completed • +{challenge.reward.xp} XP earned
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
