# Quick Start - New Architecture

## Import the Core Modules

```typescript
// All-in-one import
import {
  // Cards
  updateCardDifficulty,
  linkCards,
  computeBloomLevel,
  intelligentMigration,

  // Metrics
  retentionRate,
  averageStability,
  recallForecast,
  cardsAtRisk,

  // Relations
  buildRelationGraph,
  findConnectedCards,
  suggestRelatedCards
} from './core';

// Or import from specific modules
import { linkCards } from './core/cards';
import { retentionRate } from './core/metrics';
import { buildRelationGraph } from './core/relations';
```

## Common Use Cases

### 1. Display Retention Rate

```typescript
import { retentionRate } from './core/metrics';

function DashboardStats({ cards }: { cards: CardExtended[] }) {
  const retention = retentionRate(cards);

  return (
    <div>
      <h3>Current Retention</h3>
      <p>{(retention * 100).toFixed(1)}%</p>
    </div>
  );
}
```

### 2. Show Recall Forecast

```typescript
import { recallForecast } from './core/metrics';

function ForecastWidget({ deck, fsrsData }: Props) {
  const forecast = recallForecast(deck, fsrsData);

  return (
    <div>
      <p>Today: {(forecast.today * 100).toFixed(0)}%</p>
      <p>Tomorrow: {(forecast.tomorrow * 100).toFixed(0)}%</p>
      <p>Next Week: {(forecast.nextWeek * 100).toFixed(0)}%</p>
      <p>Next Month: {(forecast.nextMonth * 100).toFixed(0)}%</p>
    </div>
  );
}
```

### 3. Find Cards at Risk

```typescript
import { cardsAtRisk } from './core/metrics';

function RiskyCardsAlert({ cards }: { cards: CardExtended[] }) {
  const risky = cardsAtRisk(cards, 0.7);

  if (risky.length === 0) return null;

  return (
    <div className="alert">
      ⚠️ {risky.length} cards need review soon!
    </div>
  );
}
```

### 4. Build and Display Concept Graph

```typescript
import { buildRelationGraph, findHubCards, calculateDegrees } from './core/relations';

function ConceptGraph({ cards }: { cards: CardExtended[] }) {
  const graph = buildRelationGraph(cards);
  const cardsWithDegrees = calculateDegrees(cards, graph);
  const hubs = findHubCards(cardsWithDegrees, 5);

  return (
    <div>
      <p>{graph.nodeCount} cards, {graph.edgeCount} connections</p>
      <h4>Most Connected Cards:</h4>
      <ul>
        {hubs.map(card => (
          <li key={card.id}>
            {card.id} ({card.totalDegree} connections)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. Link Cards Together

```typescript
import { linkCards } from './core/cards';

function LinkButton({ card1, card2, onUpdate }: Props) {
  const handleLink = () => {
    const [updated1, updated2] = linkCards(card1, card2);
    onUpdate([updated1, updated2]);
  };

  return <button onClick={handleLink}>Link Cards</button>;
}
```

### 6. Compute Bloom Levels

```typescript
import { batchComputeBloomLevels, getBloomLevelValue } from './core/cards';

function BloomAnalysis({ cards }: { cards: CardExtended[] }) {
  const withBloom = batchComputeBloomLevels(cards);

  const byLevel = withBloom.reduce((acc, card) => {
    const level = card.bloom_level || 'remember';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <h4>Bloom Distribution:</h4>
      {Object.entries(byLevel).map(([level, count]) => (
        <div key={level}>{level}: {count} cards</div>
      ))}
    </div>
  );
}
```

### 7. Migrate Existing Data

```typescript
import { intelligentMigration } from './core/cards';
import { migrateCardsToExtended } from './schemas';

// Simple migration (adds empty fields)
const extended = migrateCardsToExtended(fsrsCards);

// Smart migration (computes Bloom + difficulty)
const intelligent = intelligentMigration(fsrsCards);

// Use in component
useEffect(() => {
  const migrated = intelligentMigration(deck);
  setExtendedDeck(migrated);
}, [deck]);
```

### 8. Get Study Suggestions

```typescript
import { suggestRelatedCards, buildRelationGraph } from './core/relations';

function StudySuggestions({ currentCardId, cards }: Props) {
  const graph = buildRelationGraph(cards);
  const suggestions = suggestRelatedCards(currentCardId, cards, graph, 5);

  return (
    <div>
      <h4>You might also want to study:</h4>
      <ul>
        {suggestions.map(({ cardId, score }) => (
          <li key={cardId}>
            Card {cardId} (relevance: {score})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 9. Session Analytics

```typescript
import { computeSessionMetrics } from './core/metrics';

function SessionSummary({ before, after, duration, ratings }: Props) {
  const metrics = computeSessionMetrics(before, after, duration, ratings);

  return (
    <div>
      <h3>Session Complete!</h3>
      <p>Cards Studied: {metrics.cardsStudied}</p>
      <p>Average Rating: {metrics.averageRating.toFixed(1)}</p>
      <p>Time Spent: {metrics.timeSpent} min</p>
      <p>Mastery Gain: +{metrics.masteryGain.toFixed(1)}</p>
      <p>Difficult Cards: {metrics.difficultCards}</p>
    </div>
  );
}
```

### 10. Find Connected Cards

```typescript
import { findConnectedCards, buildRelationGraph } from './core/relations';

function RelatedCardsView({ cardId, cards }: Props) {
  const graph = buildRelationGraph(cards);
  const connectedIds = findConnectedCards(cardId, graph, 2); // 2 hops
  const connected = cards.filter(c => connectedIds.has(c.id));

  return (
    <div>
      <h4>Related Cards ({connected.length}):</h4>
      <ul>
        {connected.map(card => (
          <li key={card.id}>{card.id}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Type Safety Examples

### Type Guards

```typescript
import { isFSRSCard, isCardExtended } from './schemas';

function processCard(data: unknown) {
  if (isFSRSCard(data)) {
    // TypeScript knows data is FSRSCard
    console.log(data.stability);
  }

  if (isCardExtended(data)) {
    // TypeScript knows data is CardExtended
    console.log(data.relations);
    console.log(data.bloom_level);
  }
}
```

### Safe Conversions

```typescript
import { toCardExtended, toFSRSCard } from './schemas';

// FSRSCard → CardExtended (adds empty fields)
const extended = toCardExtended(fsrsCard);

// CardExtended → FSRSCard (strips extended fields)
const fsrs = toFSRSCard(extendedCard);

// Round trip (safe)
const original = toFSRSCard(toCardExtended(fsrsCard));
```

## Performance Tips

### Batch Operations

```typescript
import { batchComputeBloomLevels, batchUpdateDifficulties } from './core/cards';

// Instead of looping
cards.forEach(card => computeBloomLevel(card)); // ❌ Slow

// Use batch
const withBloom = batchComputeBloomLevels(cards); // ✅ Fast
```

### Memoize Graph Construction

```typescript
import { useMemo } from 'react';
import { buildRelationGraph } from './core/relations';

function Component({ cards }: Props) {
  const graph = useMemo(
    () => buildRelationGraph(cards),
    [cards]
  );

  // Use graph...
}
```

### Cache Metrics

```typescript
import { useState, useEffect } from 'react';
import { retentionRate } from './core/metrics';

function useRetentionRate(cards: CardExtended[]) {
  const [rate, setRate] = useState(0);

  useEffect(() => {
    setRate(retentionRate(cards));
  }, [cards]);

  return rate;
}
```

## Next Steps

1. **Start small** - Add one metric to your dashboard
2. **Migrate gradually** - Use `intelligentMigration()` on load
3. **Test thoroughly** - All functions are pure, easy to test
4. **Add UI** - Build visualizations using the metrics
5. **Optimize** - Use memoization and batch operations

## Full Documentation

See `ARCHITECTURE_REFACTOR.md` for complete details.
