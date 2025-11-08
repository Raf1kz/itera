import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Pencil, Check, X, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import type { GeneratedContent } from '../types';

interface ReviewViewProps {
  generatedData: GeneratedContent;
  onSave: () => void;
  onBack: () => void;
}

export function ReviewView({ generatedData, onSave, onBack }: ReviewViewProps) {
  const [flashcards, setFlashcards] = useState(generatedData.flashcards);
  const [summary, setSummary] = useState(generatedData.summary);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showSaveHint, setShowSaveHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSaveHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleEditCard = (id: string, front: string, back: string) => {
    setFlashcards(flashcards.map(card => 
      card.id === id ? { ...card, front, back } : card
    ));
    setEditingCardId(null);
  };

  const handleDeleteCard = (id: string) => {
    setFlashcards(flashcards.filter(card => card.id !== id));
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-6 -ml-3 text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-neutral-900 mb-2">Review & Edit</h1>
              <p className="text-neutral-600 text-lg">
                Polish your AI-generated content before saving
              </p>
            </div>
            <div className="relative">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={onSave}
                  className="bg-neutral-900 hover:bg-neutral-800 h-11 shadow-lg relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save to Library
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </motion.div>
              <AnimatePresence>
                {showSaveHint && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full right-0 mt-2 bg-neutral-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      <span>Review and save when ready</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="flashcards" className="w-full">
            <TabsList className="bg-neutral-100 border border-neutral-200 mb-6 p-1">
              <TabsTrigger value="flashcards" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Flashcards ({flashcards.length})
              </TabsTrigger>
              <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Summary
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="flashcards">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {flashcards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 hover:shadow-md transition-all"
                    >
                      {editingCardId === card.id ? (
                        <motion.div 
                          className="space-y-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div>
                            <label className="text-xs text-neutral-600 mb-1.5 block">Question</label>
                            <Input
                              defaultValue={card.front}
                              onBlur={(e) => handleEditCard(card.id, e.target.value, card.back)}
                              className="border-neutral-300 h-11 focus:border-purple-500"
                              placeholder="Question"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="text-xs text-neutral-600 mb-1.5 block">Answer</label>
                            <Textarea
                              defaultValue={card.back}
                              onBlur={(e) => handleEditCard(card.id, card.front, e.target.value)}
                              className="border-neutral-300 focus:border-purple-500"
                              placeholder="Answer"
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={() => setEditingCardId(null)}
                            size="sm"
                            className="bg-neutral-900 hover:bg-neutral-800 shadow-lg"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                        </motion.div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
                              Card {index + 1}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => setEditingCardId(card.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDeleteCard(card.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 text-neutral-600 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-3.5 h-3.5 mr-1.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-neutral-500 mb-1.5 uppercase tracking-wide">Question</p>
                              <p className="text-neutral-900 leading-relaxed">{card.front}</p>
                            </div>
                            <div className="border-t border-neutral-100 pt-3">
                              <p className="text-xs text-neutral-500 mb-1.5 uppercase tracking-wide">Answer</p>
                              <p className="text-neutral-700 leading-relaxed">{card.back}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
            
            <TabsContent value="summary">
              <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[500px] border-0 p-0 resize-none focus-visible:ring-0 text-neutral-700 leading-relaxed"
                  placeholder="Your summary will appear here..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
