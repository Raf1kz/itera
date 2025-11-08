import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ReviewViewProps {
  generatedData: {
    topic: string;
    description: string;
    difficulty: string;
    cards: Array<{ id: string; front: string; back: string }>;
    summary: string;
  };
  onSave: () => void;
  onBack: () => void;
}

export function ReviewView({ generatedData, onSave, onBack }: ReviewViewProps) {
  const { topic, difficulty, cards, summary } = generatedData;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8 pb-32">
          <div className="mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-foreground mb-1">Review & save</h1>
            <p className="text-sm text-muted-foreground">
              Review your AI-generated content before saving to your library
            </p>
          </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between p-6 bg-card border border-border rounded-lg">
            <div className="space-y-1">
              <h2 className="text-foreground">{topic}</h2>
              <p className="text-sm text-muted-foreground">
                {cards.length} flashcards · {difficulty} difficulty
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">{difficulty}</Badge>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-foreground" />
              <h3 className="text-sm text-foreground">AI-generated summary</h3>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
            </div>
          </div>

          {/* Flashcards Preview */}
          <div className="space-y-3">
            <h3 className="text-sm text-foreground">Flashcards ({cards.length})</h3>
            <div className="border border-border rounded-lg divide-y divide-border bg-card">
              <ScrollArea className="max-h-[400px]">
                {cards.map((card, index) => (
                  <div key={card.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-3">
                      <span className="text-xs text-muted-foreground mt-0.5 flex-shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Question</p>
                          <p className="text-sm text-foreground">{card.front}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Answer</p>
                          <p className="text-sm text-foreground/70">{card.back}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onBack} className="h-9">
              Cancel
            </Button>
            <Button onClick={onSave} className="h-9">
              <Save className="w-4 h-4 mr-2" />
              Save to library
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
