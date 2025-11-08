# Architecture Refactor Summary

## Overview

This refactor adds architectural foundations for:
1. **Cognitive Analytics** - Advanced metrics and learning analytics
2. **AI Companion Features** - Metadata for AI-assisted learning
3. **Concept Graph Relationships** - Card interconnections and knowledge mapping

All changes maintain **100% backward compatibility** with existing FSRSCard data.

## Files Created/Modified

### 1. `/src/schemas.ts` (MODIFIED & EXTENDED)

**Added:**
- `CardExtended` schema - Extends FSRSCard with new fields
- `BloomLevel` type - Bloom's taxonomy levels
- Type guards: `isFSRSCard()`, `isCardExtended()`
- Safe converters: `toCardExtended()`, `toFSRSCard()`
- Migration helpers: `migrateCardsToExtended()`, `validateCard()`, `validateCardExtended()`

**New Fields in CardExtended:**
```typescript
{
  relations?: string[];              // Card IDs of related cards
  difficultyOverride?: number;       // UI difficulty (1-5)
  bloom_level?: BloomLevel;          // Cognitive level
  lastCompanionInteraction?: Date;   // AI companion timestamp
  companionNotes?: string;           // AI annotations
  retrievabilityHistory?: number[];  // Historical retention
  sessionIds?: string[];             // Study session tracking
}
```

**Backward Compatibility:**
- All new fields are optional
- Existing FSRSCard objects work unchanged
- Safe type guards prevent runtime errors
- Converters handle both directions (FSRSCard ↔ CardExtended)

### 2. `/src/core/cards.ts` (NEW)

Centralized card logic with pure functions:

**Difficulty Management:**
- `updateCardDifficulty()` - Adjust difficulty based on performance
- `getEffectiveDifficulty()` - Get UI-friendly difficulty (1-5)

**Bloom Taxonomy:**
- `computeBloomLevel()` - Infer cognitive level from performance
- `setBloomLevel()` - Manually set Bloom level
- `getBloomLevelValue()` - Convert to numeric for sorting

**Relationship Management:**
- `linkCards()` - Create bidirectional relationship
- `unlinkCards()` - Remove bidirectional relationship
- `addRelation()` - Unidirectional relation
- `removeRelation()` - Remove relation
- `getRelatedCardIds()` - Get all relations
- `areCardsRelated()` - Check if cards linked

**Batch Operations:**
- `batchUpdateDifficulties()` - Update multiple cards
- `batchComputeBloomLevels()` - Compute all Bloom levels
- `intelligentMigration()` - Smart FSRSCard → CardExtended

### 3. `/src/core/metrics.ts` (NEW)

Cognitive analytics with pure functions:

**Retention Metrics:**
- `computeRetrievability()` - FSRS retrievability for single card
- `retentionRate()` - Average retention across deck
- `retentionRateByState()` - Retention grouped by state

**Stability Analysis:**
- `averageStability()` - Mean stability
- `stabilityStats()` - Min, max, avg, median

**Recall Forecasting:**
- `recallForecast()` - Predict retention (today, tomorrow, week, month)

**Difficulty Analysis:**
- `averageDifficulty()` - Mean difficulty
- `cardsByDifficultyRange()` - Group by easy/medium/hard

**Performance Metrics:**
- `successRate()` - Success based on lapses
- `lapseRate()` - Inverse of success rate
- `cardsAtRisk()` - Identify cards about to be forgotten

**Session Analytics:**
- `computeSessionMetrics()` - Analyze study session performance
- `calculateMasteryScore()` - 0-100 mastery score

### 4. `/src/core/relations.ts` (NEW)

Concept graph and relationship analysis:

**Graph Data Structures:**
- `RelationGraph` - Adjacency list with metadata
- `CardWithRelations` - Card with degree information

**Graph Construction:**
- `buildRelationGraph()` - Create full graph
- `buildBidirectionalGraph()` - Only mutual relationships

**Graph Analysis:**
- `calculateDegrees()` - In-degree, out-degree, total
- `findHubCards()` - Most connected cards
- `findIsolatedCards()` - Cards with no connections

**Traversal Algorithms:**
- `findConnectedCards()` - DFS to find all connected
- `findShortestPath()` - BFS for shortest path
- `findCardsByDistance()` - Cards within N hops

**Clustering:**
- `findConnectedComponents()` - Separate groups
- `calculateClusteringCoefficient()` - Neighbor interconnection

**Recommendations:**
- `suggestRelatedCards()` - AI-style suggestions
- `findSimilarCards()` - Cards with similar difficulty/Bloom

### 5. `/src/core/index.ts` (NEW)

Central export point for all core modules.

## Usage Examples

### Migrate Existing Data

```typescript
import { migrateCardsToExtended } from './schemas';
import { intelligentMigration } from './core/cards';

// Simple migration (adds empty fields)
const extended = migrateCardsToExtended(fsrsCards);

// Smart migration (computes Bloom levels and difficulties)
const intelligent = intelligentMigration(fsrsCards);
```

### Compute Analytics

```typescript
import { retentionRate, recallForecast, cardsAtRisk } from './core/metrics';

// Current retention
const retention = retentionRate(cards);
console.log(`Current retention: ${(retention * 100).toFixed(1)}%`);

// Future forecast
const forecast = recallForecast(deck, fsrsDataMap);
console.log(`Predicted retention in 1 week: ${(forecast.nextWeek * 100).toFixed(1)}%`);

// Cards needing attention
const risky = cardsAtRisk(cards, 0.7);
console.log(`${risky.length} cards at risk of being forgotten`);
```

### Build Concept Graph

```typescript
import {
  buildRelationGraph,
  findConnectedComponents,
  findHubCards,
  suggestRelatedCards
} from './core/relations';

// Build graph
const graph = buildRelationGraph(cards);
console.log(`${graph.nodeCount} cards, ${graph.edgeCount} relationships`);

// Find knowledge clusters
const clusters = findConnectedComponents(graph);
console.log(`Found ${clusters.length} separate knowledge groups`);

// Find most important cards
const hubs = findHubCards(calculateDegrees(cards, graph), 5);
console.log('Top 5 hub cards:', hubs.map(c => c.id));

// Get study suggestions
const suggestions = suggestRelatedCards(cardId, cards, graph, 5);
console.log('Related cards to study:', suggestions);
```

### Link Cards

```typescript
import { linkCards, areCardsRelated } from './core/cards';

// Create bidirectional link
const [card1Updated, card2Updated] = linkCards(card1, card2);

// Check relationship
if (areCardsRelated(card1Updated, card2Updated)) {
  console.log('Cards are linked!');
}
```

### Compute Bloom Levels

```typescript
import { computeBloomLevel, setBloomLevel } from './core/cards';

// Auto-compute from performance
const bloomLevel = computeBloomLevel(card);
console.log(`Cognitive level: ${bloomLevel}`);

// Manually override
const updated = setBloomLevel(card, 'analyze');
```

## Type Safety

All functions are **strictly typed** with TypeScript:

```typescript
// Type guards prevent runtime errors
if (isFSRSCard(data)) {
  // data is definitely FSRSCard
  const extended = toCardExtended(data);
}

// Converters are type-safe
const fsrsCard: FSRSCard = toFSRSCard(extendedCard);
const extended: CardExtended = toCardExtended(fsrsCard);
```

## Backward Compatibility

### ✅ Existing Code Continues to Work

```typescript
// Old code - still works
const fsrsCard: FSRSCard = {
  id: '123',
  stability: 10,
  difficulty: 5,
  // ... other fields
};

// New code - optional extensions
const extended: CardExtended = {
  ...fsrsCard,
  relations: ['456', '789'],
  bloom_level: 'understand'
};

// Safe conversion both ways
const backToFSRS = toFSRSCard(extended); // Strips extensions
const backToExtended = toCardExtended(backToFSRS); // Adds empty fields
```

### ✅ Storage Compatibility

Extended fields are optional, so existing stored data loads fine:

```typescript
// Stored data (old format)
const stored = { id: '1', stability: 5, difficulty: 3, ... };

// Validate and use
const validated = validateCard(stored);
if (validated) {
  const extended = toCardExtended(validated);
  // Use with new features
}
```

## Integration Points

### With FSRS Algorithm

```typescript
import { repeatCard } from './fsrs';
import { toFSRSCard, toCardExtended } from './schemas';

// Use FSRS with extended cards
const fsrsCard = toFSRSCard(extendedCard);
const { card: updated } = repeatCard(fsrsCard, rating);
const extendedUpdated = toCardExtended(updated);
```

### With Storage

```typescript
import { saveState, loadState } from './utils/storage';
import { migrateCardsToExtended } from './schemas';

// Load and migrate
const state = await loadState();
const extended = migrateCardsToExtended(state.deck);

// Save (extended fields stored automatically)
await saveState(extended, fsrsData, proposedCards);
```

## Performance Considerations

All functions are **pure** and **optimized**:

- **O(1)** - Type guards, converters, single card operations
- **O(n)** - Metrics, batch operations, linear scans
- **O(n²)** - Graph algorithms (with early termination)
- **O(n log n)** - Sorting operations

**Memory efficient:**
- No deep cloning unless necessary
- Shared references where safe
- Set/Map for O(1) lookups

## Testing Strategy

All modules export pure functions - easy to test:

```typescript
import { retentionRate, computeRetrievability } from './core/metrics';

describe('retentionRate', () => {
  it('should return 0 for empty deck', () => {
    expect(retentionRate([])).toBe(0);
  });

  it('should compute average retrievability', () => {
    const cards = [mockCard1, mockCard2];
    const rate = retentionRate(cards);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(1);
  });
});
```

## Future Enhancements

This architecture supports:

1. **AI Companion UI** - Use `companionNotes` and `lastCompanionInteraction`
2. **Analytics Dashboard** - Use metrics module for visualizations
3. **Smart Study Paths** - Use graph to suggest optimal study order
4. **Spaced Repetition Optimization** - Use retention forecasting
5. **Knowledge Map Visualization** - Render graph with D3.js/Cytoscape
6. **Personalized Difficulty** - Use `difficultyOverride` for adaptive learning
7. **Bloom-based Filtering** - Filter by cognitive level
8. **Session Replay** - Use `sessionIds` for historical analysis

## Migration Path

**Phase 1: Foundation (DONE)**
- ✅ Schema extensions
- ✅ Core modules
- ✅ Type safety
- ✅ Backward compatibility

**Phase 2: Integration (Next)**
- Update UI components to use new schemas
- Add analytics dashboard
- Implement relationship UI

**Phase 3: Advanced Features**
- AI companion integration
- Graph visualization
- Personalized learning paths

## No Breaking Changes

- All existing FSRSCard code works unchanged
- New features are opt-in
- Type-safe migration paths
- UI unchanged (until ready)

---

**Status: ✅ Architecture foundations complete and production-ready**
