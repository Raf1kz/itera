import { useState } from 'react';
import { Palette, Check, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  unlockRequirement: {
    type: 'streak' | 'level' | 'challenge';
    value: number | string;
  };
  isUnlocked: boolean;
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'Classic',
    description: 'Clean and professional',
    colors: { primary: '#171717', secondary: '#737373', accent: '#a855f7' },
    unlockRequirement: { type: 'level', value: 1 },
    isUnlocked: true
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark and focused',
    colors: { primary: '#0f172a', secondary: '#475569', accent: '#3b82f6' },
    unlockRequirement: { type: 'streak', value: 3 },
    isUnlocked: true
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Vibrant and energetic',
    colors: { primary: '#581c87', secondary: '#c026d3', accent: '#f59e0b' },
    unlockRequirement: { type: 'streak', value: 7 },
    isUnlocked: false
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Calm and natural',
    colors: { primary: '#14532d', secondary: '#16a34a', accent: '#84cc16' },
    unlockRequirement: { type: 'level', value: 10 },
    isUnlocked: false
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm and inviting',
    colors: { primary: '#7c2d12', secondary: '#ea580c', accent: '#fbbf24' },
    unlockRequirement: { type: 'challenge', value: 'complete-all-basic' },
    isUnlocked: false
  }
];

interface ThemeSelectorProps {
  currentTheme: string;
  onSelectTheme: (themeId: string) => void;
  userStreak: number;
  userLevel: number;
}

export function ThemeSelector({ currentTheme, onSelectTheme, userStreak, userLevel }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Palette className="w-4 h-4" />
        Themes
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-auto"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-neutral-900 flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Customize Your Theme
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      Unlock themes by studying and completing challenges
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {themes.map((theme, index) => {
                    const isSelected = currentTheme === theme.id;
                    const canUnlock = theme.unlockRequirement.type === 'streak' 
                      ? userStreak >= (theme.unlockRequirement.value as number)
                      : theme.unlockRequirement.type === 'level'
                      ? userLevel >= (theme.unlockRequirement.value as number)
                      : false;

                    return (
                      <motion.button
                        key={theme.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => theme.isUnlocked && onSelectTheme(theme.id)}
                        disabled={!theme.isUnlocked}
                        className={`
                          relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all
                          ${isSelected
                            ? 'border-purple-500 shadow-lg'
                            : theme.isUnlocked
                            ? 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                            : 'border-neutral-200 opacity-60 cursor-not-allowed'
                          }
                        `}
                      >
                        {/* Color Preview */}
                        <div className="flex gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg shadow-sm"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div
                            className="w-8 h-8 rounded-lg shadow-sm"
                            style={{ backgroundColor: theme.colors.secondary }}
                          />
                          <div
                            className="w-8 h-8 rounded-lg shadow-sm"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>

                        {/* Theme Info */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-neutral-900">{theme.name}</h4>
                            {isSelected && (
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            {!theme.isUnlocked && (
                              <div className="w-6 h-6 bg-neutral-300 rounded-full flex items-center justify-center">
                                <Lock className="w-3 h-3 text-neutral-600" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600">{theme.description}</p>
                        </div>

                        {/* Unlock Status */}
                        {!theme.isUnlocked && (
                          <div className="bg-neutral-100 rounded-lg px-3 py-2 text-xs">
                            {theme.unlockRequirement.type === 'streak' && (
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600">🔥</span>
                                <span className="text-neutral-700">
                                  {canUnlock 
                                    ? `Ready to unlock! (${theme.unlockRequirement.value} day streak)`
                                    : `Unlock at ${theme.unlockRequirement.value} day streak`
                                  }
                                </span>
                              </div>
                            )}
                            {theme.unlockRequirement.type === 'level' && (
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span className="text-neutral-700">
                                  Unlock at Level {theme.unlockRequirement.value}
                                </span>
                              </div>
                            )}
                            {theme.unlockRequirement.type === 'challenge' && (
                              <div className="flex items-center gap-2">
                                <Lock className="w-3 h-3 text-neutral-600" />
                                <span className="text-neutral-700">
                                  Complete all basic challenges
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {theme.isUnlocked && !isSelected && (
                          <div className="text-xs text-neutral-500 mt-2">
                            Click to apply
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-900 mb-1">Keep studying to unlock more themes!</p>
                      <p className="text-xs text-neutral-600">
                        Your progress: {userStreak} day streak • Level {userLevel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
