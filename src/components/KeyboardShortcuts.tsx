import { motion, AnimatePresence } from 'motion/react';
import { X, Command } from 'lucide-react';
import { useEffect, useState } from 'react';

export function KeyboardShortcuts() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsVisible(!isVisible);
      }
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  const shortcuts = [
    { key: '⌘K', description: 'Toggle keyboard shortcuts' },
    { key: '⌘G', description: 'Go to Generate' },
    { key: '⌘D', description: 'Go to Decks' },
    { key: '⌘S', description: 'Go to Study Dashboard' },
    { key: 'Space', description: 'Flip flashcard' },
    { key: '←/→', description: 'Navigate flashcards' },
    { key: 'Esc', description: 'Close dialogs' },
  ];

  return (
    <>
      {/* Trigger hint */}
      <motion.div
        className="fixed bottom-4 right-4 z-40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        <button
          onClick={() => setIsVisible(true)}
          className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all text-sm text-neutral-600 hover:text-neutral-900 group"
        >
          <Command className="w-4 h-4" />
          <span>Keyboard shortcuts</span>
          <kbd className="px-2 py-1 bg-neutral-100 rounded text-xs group-hover:bg-neutral-200 transition-colors">
            ⌘K
          </kbd>
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsVisible(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-neutral-900 flex items-center gap-2">
                    <Command className="w-5 h-5" />
                    Keyboard Shortcuts
                  </h3>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-sm text-neutral-700">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-900 font-medium">
                        {shortcut.key}
                      </kbd>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
