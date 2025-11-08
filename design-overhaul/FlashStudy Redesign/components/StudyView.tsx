import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Search, Clock, Target, TrendingUp, Play } from 'lucide-react';

interface StudyDeck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  category: string;
  lastStudied?: string;
  progress: number;
  mastery: number;
}

const STUDY_DECKS: StudyDeck[] = [
  {
    id: '1',
    title: 'Spanish Vocabulary',
    description: 'Common Spanish words and phrases for beginners',
    cardCount: 50,
    category: 'Languages',
    lastStudied: '2 hours ago',
    progress: 65,
    mastery: 72,
  },
  {
    id: '2',
    title: 'React Fundamentals',
    description: 'Core concepts and hooks in React',
    cardCount: 30,
    category: 'Programming',
    lastStudied: 'Yesterday',
    progress: 40,
    mastery: 55,
  },
  {
    id: '3',
    title: 'World Capitals',
    description: 'Capital cities of countries around the world',
    cardCount: 75,
    category: 'Geography',
    lastStudied: '3 days ago',
    progress: 85,
    mastery: 88,
  },
  {
    id: '4',
    title: 'Biology Terms',
    description: 'Essential biology vocabulary and definitions',
    cardCount: 40,
    category: 'Science',
    progress: 20,
    mastery: 30,
  },
];

export function StudyView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const filteredDecks = STUDY_DECKS.filter(deck =>
    deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground mb-1">Study</h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and continue learning
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total decks</span>
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">{STUDY_DECKS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {STUDY_DECKS.reduce((acc, deck) => acc + deck.cardCount, 0)} cards
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Study streak</span>
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">7 days</p>
            <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Avg mastery</span>
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">
              {Math.round(STUDY_DECKS.reduce((acc, deck) => acc + deck.mastery, 0) / STUDY_DECKS.length)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">All decks</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-input-background border-input"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Decks</TabsTrigger>
            <TabsTrigger value="recent">Recently Studied</TabsTrigger>
            <TabsTrigger value="need-review">Need Review</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-3">
              {filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="p-4 bg-card border border-border rounded-lg hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm text-foreground">{deck.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {deck.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{deck.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{deck.progress}%</span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${getProgressColor(deck.progress)}`}
                          style={{ width: `${deck.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{deck.cardCount} cards</span>
                        {deck.lastStudied && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{deck.lastStudied}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <Button size="sm" className="h-7 text-xs">
                        <Play className="w-3 h-3 mr-1.5" />
                        Study
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {filteredDecks.filter(deck => deck.lastStudied).length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No recently studied decks yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDecks
                  .filter(deck => deck.lastStudied)
                  .map((deck) => (
                  <div
                    key={deck.id}
                    className="p-4 bg-card border border-border rounded-lg hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm text-foreground">{deck.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {deck.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{deck.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground">{deck.progress}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getProgressColor(deck.progress)}`}
                            style={{ width: `${deck.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{deck.cardCount} cards</span>
                          {deck.lastStudied && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{deck.lastStudied}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <Button size="sm" className="h-7 text-xs">
                          <Play className="w-3 h-3 mr-1.5" />
                          Study
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="need-review" className="mt-6">
            <div className="space-y-3">
              {filteredDecks
                .filter(deck => deck.progress < 60)
                .map((deck) => (
                  <div
                    key={deck.id}
                    className="p-4 bg-card border border-border rounded-lg hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm text-foreground">{deck.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {deck.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{deck.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground">{deck.progress}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getProgressColor(deck.progress)}`}
                            style={{ width: `${deck.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{deck.cardCount} cards</span>
                          {deck.lastStudied && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{deck.lastStudied}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <Button size="sm" className="h-7 text-xs">
                          <Play className="w-3 h-3 mr-1.5" />
                          Study
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
