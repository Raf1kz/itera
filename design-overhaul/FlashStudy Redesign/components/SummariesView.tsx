import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { FileText, Search, Clock, BookOpen, Eye } from 'lucide-react';

interface Summary {
  id: string;
  title: string;
  subject: string;
  date: string;
  wordCount: number;
  readingTime: number;
  preview: string;
  relatedDeck?: string;
}

const MOCK_SUMMARIES: Summary[] = [
  {
    id: '1',
    title: 'Cell Biology Fundamentals',
    subject: 'Biology',
    date: '2 hours ago',
    wordCount: 1250,
    readingTime: 6,
    preview: 'Comprehensive overview of cellular structure and function, including the roles of organelles, cell membrane transport mechanisms, and energy production through mitochondria...',
    relatedDeck: 'Biology Terms',
  },
  {
    id: '2',
    title: 'React Hooks Deep Dive',
    subject: 'Programming',
    date: 'Yesterday',
    wordCount: 2100,
    readingTime: 10,
    preview: 'In-depth explanation of React Hooks including useState, useEffect, useContext, and custom hooks. Covers best practices, common patterns, and performance optimization...',
    relatedDeck: 'React Fundamentals',
  },
  {
    id: '3',
    title: 'World War II - Key Events',
    subject: 'History',
    date: '3 days ago',
    wordCount: 1800,
    readingTime: 9,
    preview: 'Timeline and analysis of major events during World War II, including causes, key battles, political decisions, and the aftermath that shaped modern geopolitics...',
  },
  {
    id: '4',
    title: 'Spanish Grammar Essentials',
    subject: 'Languages',
    date: '1 week ago',
    wordCount: 950,
    readingTime: 5,
    preview: 'Essential Spanish grammar rules covering verb conjugations, noun gender, adjective agreement, and common sentence structures for beginners...',
    relatedDeck: 'Spanish Vocabulary',
  },
  {
    id: '5',
    title: 'Photosynthesis Process',
    subject: 'Biology',
    date: '1 week ago',
    wordCount: 1400,
    readingTime: 7,
    preview: 'Detailed breakdown of photosynthesis including light-dependent reactions, the Calvin cycle, and the role of chloroplasts in energy conversion...',
    relatedDeck: 'Biology Terms',
  },
];

interface SummariesViewProps {
  onViewSummary: (summaryId: string) => void;
}

export function SummariesView({ onViewSummary }: SummariesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSummaries = MOCK_SUMMARIES.filter(summary =>
    summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground mb-1">Summaries</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated summaries from your course materials
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total summaries</span>
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">{MOCK_SUMMARIES.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subjects
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Reading time</span>
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">
              {MOCK_SUMMARIES.reduce((acc, s) => acc + s.readingTime, 0)} min
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              To review all
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total words</span>
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl text-foreground">
              {(MOCK_SUMMARIES.reduce((acc, s) => acc + s.wordCount, 0) / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Words of content
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-input-background border-input"
            />
          </div>
        </div>

        {/* Summaries List */}
        <div className="space-y-3">
          {filteredSummaries.map((summary) => (
            <div
              key={summary.id}
              className="p-4 bg-card border border-border rounded-lg hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm text-foreground">{summary.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {summary.subject}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {summary.preview}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{summary.readingTime} min</span>
                  </div>
                  <span>•</span>
                  <span>{summary.wordCount} words</span>
                  <span>•</span>
                  <span>{summary.date}</span>
                  {summary.relatedDeck && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{summary.relatedDeck}</span>
                      </div>
                    </>
                  )}
                </div>
                <Button onClick={() => onViewSummary(summary.id)} size="sm" className="h-7 text-xs">
                  <Eye className="w-3 h-3 mr-1.5" />
                  Read
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredSummaries.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No summaries found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
