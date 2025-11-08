import { Layers, Calendar, Sparkles, Loader2, Trash2, PlayCircle, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmptyState } from './EmptyState';
import { useAuthenticatedSupabase } from '../hooks/useAuthenticatedSupabase';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useState } from 'react';
import { Checkbox } from './ui/checkbox';

interface DecksViewProps {
  onStudyDeck: (deckId: string) => void;
}

interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  deck_name: string;
  created_at: string;
}

export function DecksView({ onStudyDeck }: DecksViewProps) {
  const supabase = useAuthenticatedSupabase();
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [deleteDeckName, setDeleteDeckName] = useState<string | null>(null);
  const [collapsedDecks, setCollapsedDecks] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const cardsQuery = useQuery<Card[]>({
    queryKey: ['cards', isSignedIn],
    enabled: Boolean(supabase && isSignedIn),
    queryFn: async () => {
      const client = supabase;
      if (!client) {
        return [];
      }

      const { data, error: fetchError} = await client
        .from('cards')
        .select('id, front, back, tags, deck_name, created_at')
        .order('deck_name', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching cards:', fetchError);
        throw fetchError;
      }

      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!supabase) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setDeleteCardId(null);
    },
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      if (!supabase) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .in('id', cardIds);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setSelectedCards(new Set());
      setSelectionMode(false);
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (deckName: string) => {
      if (!supabase) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_name', deckName);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setDeleteDeckName(null);
    },
  });

  const cards = cardsQuery.data ?? [];
  const loading = cardsQuery.isLoading || cardsQuery.isFetching;

  if (cardsQuery.isError) {
    console.error('cards_query_error', cardsQuery.error);
  }

  // Group cards by deck_name
  const deckGroups = cards.reduce((acc, card) => {
    const deckName = card.deck_name || 'General';
    if (!acc[deckName]) {
      acc[deckName] = [];
    }
    acc[deckName].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  const deckNames = Object.keys(deckGroups).sort();
  const totalCards = cards.length;

  const handleDelete = () => {
    if (deleteCardId) {
      deleteMutation.mutate(deleteCardId);
    }
  };

  const handleDeleteDeck = () => {
    if (deleteDeckName) {
      deleteDeckMutation.mutate(deleteDeckName);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCards.size > 0) {
      deleteMultipleMutation.mutate(Array.from(selectedCards));
    }
  };

  const toggleDeckCollapse = (deckName: string) => {
    const newCollapsed = new Set(collapsedDecks);
    if (newCollapsed.has(deckName)) {
      newCollapsed.delete(deckName);
    } else {
      newCollapsed.add(deckName);
    }
    setCollapsedDecks(newCollapsed);
  };

  const toggleCardSelection = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const toggleSelectAllInDeck = (deckName: string) => {
    const deck = deckGroups[deckName];
    if (!deck) return;

    const deckCardIds = deck.map(card => card.id);
    const allSelected = deckCardIds.every(id => selectedCards.has(id));
    const newSelected = new Set(selectedCards);

    if (allSelected) {
      deckCardIds.forEach(id => newSelected.delete(id));
    } else {
      deckCardIds.forEach(id => newSelected.add(id));
    }
    setSelectedCards(newSelected);
  };

  return (
    <div className="h-full overflow-auto relative">
      {/* Premium background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100/30" />

      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }} />

      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-8 py-16">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-neutral-900/10 rounded-3xl blur-2xl" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-2xl flex items-center justify-center shadow-xl">
                  <Layers className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
              </div>
              <div>
                <h1 className="text-neutral-900">Flashcards</h1>
                <p className="text-neutral-600 text-lg mt-1">
                  {loading ? 'Loading...' : `${totalCards} card${totalCards !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {totalCards > 0 && (
              <div className="flex items-center gap-3">
                {selectionMode ? (
                  <>
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={selectedCards.size === 0 || deleteMultipleMutation.isPending}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {selectedCards.size} Selected
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectionMode(false);
                        setSelectedCards(new Set());
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setSelectionMode(true)}
                      variant="outline"
                      size="sm"
                      className="border-neutral-300"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select
                    </Button>
                    <Button
                      onClick={() => onStudyDeck('all')}
                      className="relative bg-neutral-900 hover:bg-neutral-800 overflow-hidden group/study"
                      size="sm"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/study:translate-x-[200%] transition-transform duration-1000" />
                      <span className="relative z-10 flex items-center">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Study All
                      </span>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No flashcards yet"
            description="Generate your first flashcards by uploading notes or typing content. Our AI will create powerful study materials to help you learn."
            actionLabel="Generate Flashcards"
            onAction={() => window.location.hash = '#generate'}
          />
        ) : (
          /* Decks Grouped */
          <div className="space-y-8">
          {deckNames.map((deckName) => {
            const isCollapsed = collapsedDecks.has(deckName);
            const deckCards = deckGroups[deckName];
            if (!deckCards) return null;

            const allCardsSelected = deckCards.every(card => selectedCards.has(card.id));

            return (
            <motion.div
              key={deckName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
              className="relative group bg-white/80 backdrop-blur-xl rounded-3xl border border-neutral-200/60 overflow-hidden shadow-lg hover:shadow-2xl transition-all"
            >
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/5 to-neutral-900/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              {/* Deck Header */}
              <div className="relative flex items-center justify-between p-5 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => toggleDeckCollapse(deckName)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  {selectionMode && (
                    <Checkbox
                      checked={allCardsSelected}
                      onCheckedChange={() => toggleSelectAllInDeck(deckName)}
                      className="h-5 w-5"
                    />
                  )}
                  <h2 className="text-xl font-semibold text-neutral-900">{deckName}</h2>
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-sm">
                    {deckCards.length} card{deckCards.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onStudyDeck(deckName)}
                    variant="outline"
                    size="sm"
                    className="relative border-neutral-300 hover:bg-neutral-100 overflow-hidden group/btn"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000" />
                    <span className="relative z-10 flex items-center">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Study
                    </span>
                  </Button>
                  <Button
                    onClick={() => setDeleteDeckName(deckName)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Cards Grid for this Deck */}
              <AnimatePresence>
              {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-4 sm:p-5">
              {deckCards.map((card, index) => (
            <motion.div
              key={card.id}
              data-testid="card-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className={`relative bg-white/80 backdrop-blur-xl border-2 rounded-2xl p-6 transition-all group ${
                selectedCards.has(card.id)
                  ? 'border-neutral-900 shadow-xl'
                  : 'border-neutral-200/60 hover:border-neutral-300 hover:shadow-lg'
              }`}
            >
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/5 to-neutral-900/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <Checkbox
                      checked={selectedCards.has(card.id)}
                      onCheckedChange={() => toggleCardSelection(card.id)}
                      className="h-5 w-5"
                    />
                  )}
                  {card.tags && card.tags.length > 0 && (
                    <div className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium">
                      {card.tags[0]}
                    </div>
                  )}
                </div>
                <div className="w-9 h-9 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:bg-neutral-900 transition-all">
                  <Layers className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
              </div>

              <div className="relative mb-5">
                <h3 className="text-neutral-900 mb-3 leading-snug font-medium">{card.front}</h3>
                <p className="text-sm text-neutral-600 line-clamp-3">{card.back}</p>
              </div>

              <div className="relative flex items-center justify-between text-sm text-neutral-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <span>{new Date(card.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                {!selectionMode && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCardId(card.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
              ))}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      );
    })}
          </div>
        )}
      </div>

      {/* Delete Deck Dialog */}
      <AlertDialog open={!!deleteDeckName} onOpenChange={() => setDeleteDeckName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entire Deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {deckGroups[deleteDeckName || '']?.length || 0} cards in the "{deleteDeckName}" deck. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDeckMutation.isPending}
            >
              {deleteDeckMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Deck'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this flashcard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
