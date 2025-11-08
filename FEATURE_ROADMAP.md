# StudyFlash Feature Roadmap

**Version:** 1.0
**Last Updated:** 2025-10-28
**Objective:** Transform StudyFlash from basic flashcard app into personalized cognitive learning system

## Priority Matrix

| Priority | Focus | Features | Status |
|----------|-------|----------|--------|
| **P1** | Immediate Value | Concept Clusters, Bloom Tagging, Daily Planner | ✅ **COMPLETED** |
| **P2** | Retention & Engagement | Reflection Mode, Adaptive Difficulty | ✅ **COMPLETED** |
| **P3** | Advanced Intelligence | Document Mode, Concept Graph Viz, Learning Velocity | 🔄 **NEXT** |
| **P4** | Monetization Enablers | Sync & Backup, Pro Features, PDF Ingestion | 📋 **PLANNED** |
| **P5** | Differentiation | Exam Simulator, Cohort Benchmarking, Explain Back Mode | 📋 **PLANNED** |

---

## 1. COGNITIVE LAYER (Core Advantage)

### 1.1 Adaptive Difficulty Shaping
**Purpose:** Dynamically adjust card difficulty based on recall patterns to optimize learning efficiency

**Required Modules:**
- `src/core/cards.ts` - Extend with difficulty recalculation logic
- `src/core/metrics.ts` - Add pattern detection functions
- New: `src/core/adaptive.ts` - Adaptive algorithms

**Implementation Outline:**
```typescript
// Detect patterns in recall history
function detectRecallPattern(card: CardExtended, history: number[]): Pattern {
  // Analyze: consistent failure, plateau, mastery
}

// Recommend card modifications
function suggestCardRevision(card: CardExtended, pattern: Pattern): Suggestion {
  // Split complex cards, merge trivial ones, reword confusing phrasing
}

// Auto-apply or prompt user
async function applyAdaptiveChanges(suggestions: Suggestion[]): Promise<void>
```

**Monetization Potential:** Premium feature - automatic card optimization
**Technical Complexity:** High (requires LLM for rewriting, pattern ML)
**Priority:** P3
**Dependencies:** FSRS history tracking, retrievability data
**Estimated Effort:** 2-3 weeks

---

### 1.2 Spaced Context Linking (Concept Clusters)
**Purpose:** Automatically group related cards from same source paragraph/topic for coherent review

**Required Modules:**
- `src/core/relations.ts` - Extend with auto-clustering
- `src/schemas.ts` - Add `sourceContext` field to CardExtended
- `supabase/functions/generate-flashcards` - Preserve paragraph metadata

**Implementation Outline:**
```typescript
// Already partially implemented in relations.ts
interface ConceptCluster {
  id: string;
  cards: string[]; // card IDs
  sourceHash: string; // paragraph hash
  topic: string; // inferred topic
  coherence: number; // 0-1 cluster quality score
}

function buildConceptClusters(cards: CardExtended[]): ConceptCluster[] {
  // Group by sourceHash, then by semantic similarity
}

function studyByCluster(cluster: ConceptCluster): StudySession {
  // Review all cards in one cluster together for context
}
```

**Monetization Potential:** Free tier: max 3 clusters, Pro: unlimited
**Technical Complexity:** Medium (extend existing graph code)
**Priority:** P1 ⭐ **HIGH LEVERAGE**
**Dependencies:** Current relations.ts, source metadata from generation
**Estimated Effort:** 1 week

---

### 1.3 'Why?' Reinforcement
**Purpose:** After correct answer, generate causal follow-up to deepen understanding

**Required Modules:**
- New: `src/components/StudySession.tsx` - Add follow-up flow
- `supabase/functions/ai-companion` - New endpoint for follow-up generation

**Implementation Outline:**
```typescript
// In study session after correct answer (rating 3-4)
async function generateWhyQuestion(card: Card): Promise<string> {
  // Call edge function with card context
  // Returns: "Why does X cause Y?" or "Explain the mechanism behind..."
}

// User can skip or attempt
// Correct follow-up → bonus stability increase
```

**Monetization Potential:** Pro feature - unlimited follow-ups
**Technical Complexity:** Medium (new LLM prompt, UI flow)
**Priority:** P2
**Dependencies:** ai-companion function, study flow refactor
**Estimated Effort:** 1 week

---

## 2. INPUT INTELLIGENCE

### 2.1 Document Mode (PDF/DOCX/MD)
**Purpose:** Accept full documents and auto-generate flashcards from structured content

**Required Modules:**
- New: `supabase/functions/document-ingest` - File processing edge function
- New: `src/components/DocumentUpload.tsx` - Drag-drop UI
- Libraries: `pdf-parse` (Deno), `mammoth` for DOCX

**Implementation Outline:**
```typescript
// Edge function flow
async function processDocument(file: Blob, type: 'pdf'|'docx'|'md'): Promise<{
  text: string;
  structure: Section[];
  metadata: { title, author, pages }
}> {
  // Extract text with structure preservation
  // Identify headings, sections, lists
}

// Feed to generate-flashcards in chunks
// Preserve section metadata for concept clusters
```

**Monetization Potential:** Premium feature - document ingestion
**Technical Complexity:** High (file parsing, edge function limits)
**Priority:** P3
**Dependencies:** File upload storage, larger token budgets
**Estimated Effort:** 2-3 weeks

---

### 2.2 Auto-Topic Segmentation
**Purpose:** Split long notes into coherent sub-decks by subject automatically

**Required Modules:**
- New: `src/core/segmentation.ts` - Topic detection
- `supabase/functions/generate-flashcards` - Add segmentation mode

**Implementation Outline:**
```typescript
// Use embeddings to detect topic shifts
function segmentByTopic(text: string): Section[] {
  // Sliding window + embedding similarity
  // Breaks where cosine similarity drops below threshold
}

// Create separate decks or tagged categories
```

**Monetization Potential:** Pro feature - auto-segmentation
**Technical Complexity:** Medium-High (embeddings, threshold tuning)
**Priority:** P3
**Dependencies:** Embedding API, document mode
**Estimated Effort:** 2 weeks

---

### 2.3 Visual Extraction (OCR + Captions)
**Purpose:** Extract text from images, diagrams, slides for flashcard generation

**Required Modules:**
- New: `supabase/functions/vision-extract` - Image processing
- Integration: OpenAI Vision API or Tesseract OCR

**Implementation Outline:**
```typescript
// Process uploaded image
async function extractFromImage(image: Blob): Promise<{
  text: string;
  captions: string[];
  concepts: string[];
}> {
  // OCR for text
  // Vision API for diagram understanding
  // Return structured content
}
```

**Monetization Potential:** Premium feature - visual extraction
**Technical Complexity:** High (Vision API costs, accuracy issues)
**Priority:** P4
**Dependencies:** Image storage, Vision API key
**Estimated Effort:** 2-3 weeks

---

## 3. STUDY COMPANION DEPTH

### 3.1 Reflection Mode (Session Summary)
**Purpose:** Generate end-of-session insights with 3 key points: strengths, weaknesses, next steps

**Required Modules:**
- `src/components/StudySession.tsx` - Add session end flow
- `supabase/functions/ai-companion` - Add reflection endpoint

**Implementation Outline:**
```typescript
interface SessionReflection {
  strengths: string[]; // "Mastered X concept"
  weaknesses: string[]; // "Struggled with Y"
  nextSteps: string[]; // "Focus on Z tomorrow"
  masteryGain: number; // Overall improvement
}

async function generateReflection(session: StudyMetrics): Promise<SessionReflection> {
  // Analyze cards reviewed, ratings, time spent
  // Call LLM with session data
}
```

**Monetization Potential:** Free: 1 reflection/day, Pro: unlimited
**Technical Complexity:** Medium (LLM prompt, session tracking)
**Priority:** P2 ⭐ **HIGH VALUE**
**Dependencies:** Session metrics tracking, ai-companion
**Estimated Effort:** 1 week

---

### 3.2 Dialogue Replay
**Purpose:** Store and replay past companion sessions for review

**Required Modules:**
- New: `src/utils/sessionStorage.ts` - Persist companion conversations
- `src/components/CompanionChat.tsx` - Add history sidebar

**Implementation Outline:**
```typescript
interface CompanionSession {
  id: string;
  timestamp: Date;
  summary: string;
  questions: Question[];
  userAnswers: string[];
  scores: number[];
}

// Store in localStorage or Supabase (if auth)
function saveSession(session: CompanionSession): void
function loadSessionHistory(): CompanionSession[]
function replaySession(sessionId: string): void
```

**Monetization Potential:** Pro feature - unlimited history
**Technical Complexity:** Low (storage + UI)
**Priority:** P2
**Dependencies:** CompanionChat refactor
**Estimated Effort:** 3-5 days

---

### 3.3 'Explain Back' Mode
**Purpose:** User teaches AI the concept; AI grades completeness

**Required Modules:**
- `src/components/ExplainBack.tsx` - New study mode UI
- `supabase/functions/ai-companion` - Add grading endpoint

**Implementation Outline:**
```typescript
// Reverse flow: show answer, user explains question
async function gradeExplanation(
  card: Card,
  userExplanation: string
): Promise<{
  completeness: number; // 0-1
  missing: string[]; // Key concepts not mentioned
  feedback: string;
}> {
  // LLM grades against expected question/concept
}
```

**Monetization Potential:** Premium feature - explain back mode
**Technical Complexity:** High (complex grading logic)
**Priority:** P5
**Dependencies:** ai-companion grading
**Estimated Effort:** 2 weeks

---

## 4. ANALYTICS AND PERFORMANCE

### 4.1 Concept Graph Visualization
**Purpose:** Interactive force-directed graph showing card relationships and stability

**Required Modules:**
- New: `src/components/ConceptGraph.tsx` - D3.js or Cytoscape visualization
- `src/core/relations.ts` - Already has graph data structures

**Implementation Outline:**
```typescript
// Use existing buildRelationGraph() output
function renderConceptGraph(graph: RelationGraph, cards: CardExtended[]): void {
  // Nodes: cards (colored by stability)
  // Edges: relationships
  // Interactive: click to see card, zoom/pan
  // Clustering: connected components highlighted
}
```

**Monetization Potential:** Pro feature - graph visualization
**Technical Complexity:** Medium (D3.js learning curve, performance)
**Priority:** P3
**Dependencies:** Existing relations.ts, graph library
**Estimated Effort:** 1-2 weeks

---

### 4.2 Learning Velocity & Drift
**Purpose:** Track study pace, stability changes over time, decay predictions

**Required Modules:**
- `src/core/metrics.ts` - Extend with velocity calculations
- New: `src/components/VelocityDashboard.tsx`

**Implementation Outline:**
```typescript
interface LearningVelocity {
  cardsPerWeek: number;
  avgTimePerCard: number; // seconds
  stabilityDelta: number; // avg change per week
  decayRate: number; // cards dropping below threshold
}

function computeVelocity(
  cards: CardExtended[],
  timeWindow: number // days
): LearningVelocity
```

**Monetization Potential:** Pro feature - advanced analytics
**Technical Complexity:** Medium (time-series analysis)
**Priority:** P2
**Dependencies:** Historical data storage
**Estimated Effort:** 1 week

---

### 4.3 Cohort Benchmarking
**Purpose:** Compare user metrics to anonymous aggregate of similar decks

**Required Modules:**
- New: Supabase table `cohort_metrics` (aggregated, no PII)
- `src/components/BenchmarkView.tsx`

**Implementation Outline:**
```typescript
// Aggregate metrics anonymously
interface CohortMetrics {
  deckSize: number;
  avgRetention: number;
  avgStability: number;
  percentile: number; // User's position
}

// User sees: "You're in top 25% for retention in CS decks"
```

**Monetization Potential:** Pro feature - benchmarking
**Technical Complexity:** Medium-High (privacy, aggregation logic)
**Priority:** P5
**Dependencies:** Supabase auth, data aggregation pipeline
**Estimated Effort:** 2 weeks

---

## 5. PRODUCT LAYER

### 5.1 Goal Planner
**Purpose:** Generate daily study plan based on time budget and card priority

**Required Modules:**
- New: `src/components/GoalPlanner.tsx`
- `src/utils/scheduler.ts` - Planning algorithm

**Implementation Outline:**
```typescript
interface DailyPlan {
  targetMinutes: number;
  cards: {
    id: string;
    priority: number; // based on due date, stability
    estimatedTime: number; // seconds
  }[];
  expectedGain: number; // projected stability increase
}

function generateDailyPlan(
  cards: CardExtended[],
  fsrsData: Map<string, FSRSCard>,
  timeAvailable: number
): DailyPlan {
  // Sort by priority (due soon + low stability)
  // Pack into time budget
  // Return ordered list
}
```

**Monetization Potential:** Free: basic planner, Pro: AI-optimized plans
**Technical Complexity:** Low-Medium (scheduling algorithm)
**Priority:** P1 ⭐ **HIGH RETENTION**
**Dependencies:** None (pure algorithm)
**Estimated Effort:** 1 week

---

### 5.2 Habit Automation (Daily Digest)
**Purpose:** Send daily email/push with 5 due cards + 1 insight

**Required Modules:**
- New: Supabase Edge Function `daily-digest` (cron trigger)
- Integration: SendGrid or Resend for emails

**Implementation Outline:**
```typescript
// Cron: daily at 8am user local time
async function sendDailyDigest(userId: string): Promise<void> {
  // Load due cards
  // Pick top 5 by priority
  // Generate 1 insight (streak, mastery gain, etc.)
  // Send email with embedded card previews
}
```

**Monetization Potential:** Pro feature - daily digests
**Technical Complexity:** Medium (cron setup, email service)
**Priority:** P2
**Dependencies:** Supabase auth, email service
**Estimated Effort:** 1 week

---

### 5.3 Sync & Backup (Supabase Auth + RLS)
**Purpose:** Cross-device sync with row-level security

**Required Modules:**
- Supabase tables: `user_cards`, `user_fsrs_data`, `user_sessions`
- `src/utils/storage.ts` - Extend with Supabase sync
- RLS policies for user isolation

**Implementation Outline:**
```sql
-- RLS policy
CREATE POLICY "Users can only access their own cards"
ON user_cards FOR ALL
USING (auth.uid() = user_id);

-- Sync logic
async function syncToCloud(localData: State): Promise<void>
async function syncFromCloud(): Promise<State>
```

**Monetization Potential:** Pro feature - cloud sync
**Technical Complexity:** Medium (RLS, conflict resolution)
**Priority:** P4
**Dependencies:** Supabase auth already integrated
**Estimated Effort:** 1-2 weeks

---

### 5.4 Pro Features Paywall
**Purpose:** Implement subscription tiers with Stripe integration

**Required Modules:**
- New: `src/components/PaywallModal.tsx`
- `supabase/functions/stripe-webhook` - Handle subscriptions
- Integration: Stripe Checkout

**Implementation Outline:**
```typescript
// Tiers
const PLANS = {
  free: {
    price: 0,
    limits: {
      cardsPerDeck: 100,
      decks: 3,
      aiQuestions: 10 / 'week',
      features: ['basic analytics', 'manual card creation']
    }
  },
  pro: {
    price: 9.99, // monthly
    limits: {
      cardsPerDeck: Infinity,
      decks: Infinity,
      aiQuestions: Infinity,
      features: [
        'document ingestion',
        'concept graph',
        'reflection mode',
        'cloud sync',
        'export to PDF/Anki'
      ]
    }
  }
}
```

**Monetization Potential:** Core revenue driver
**Technical Complexity:** Medium (Stripe integration, RLS by tier)
**Priority:** P4
**Dependencies:** Feature parity for paywall value
**Estimated Effort:** 2 weeks

---

## 6. PEDAGOGICAL EXTENSIONS

### 6.1 Bloom-Level Tagging (Auto)
**Purpose:** Automatically assign Bloom taxonomy levels to cards for cognitive tracking

**Required Modules:**
- `src/core/cards.ts` - Already has `computeBloomLevel()`
- `supabase/functions/generate-flashcards` - Add Bloom detection in prompt

**Implementation Outline:**
```typescript
// Already partially implemented
// Enhance with LLM-based tagging during generation
const BLOOM_PROMPTS = {
  remember: "Recall facts, terms, definitions",
  understand: "Explain concepts in own words",
  apply: "Use knowledge in new situations",
  analyze: "Break down relationships",
  evaluate: "Make judgments",
  create: "Produce original work"
}

// Tag during generation + auto-compute from performance
```

**Monetization Potential:** Free feature (differentiator)
**Technical Complexity:** Low (extend existing code)
**Priority:** P1 ⭐ **QUICK WIN**
**Dependencies:** Existing Bloom schema
**Estimated Effort:** 3-5 days

---

### 6.2 Curriculum Mode
**Purpose:** Lock next deck until mastery threshold reached

**Required Modules:**
- New: `src/components/CurriculumView.tsx`
- `src/schemas.ts` - Add curriculum metadata

**Implementation Outline:**
```typescript
interface Curriculum {
  id: string;
  name: string;
  decks: {
    id: string;
    order: number;
    unlockThreshold: number; // mastery %
    locked: boolean;
  }[];
}

function checkUnlock(curriculum: Curriculum, userProgress: Map<string, number>): void {
  // Unlock next deck if threshold met
}
```

**Monetization Potential:** Pro feature - structured curricula
**Technical Complexity:** Low (state management)
**Priority:** P4
**Dependencies:** Mastery calculation
**Estimated Effort:** 1 week

---

### 6.3 Exam Simulator
**Purpose:** Generate timed mock exams, report weak areas

**Required Modules:**
- New: `src/components/ExamMode.tsx`
- `supabase/functions/exam-generator` - Create balanced exam

**Implementation Outline:**
```typescript
interface Exam {
  id: string;
  duration: number; // minutes
  questions: Card[];
  startTime: Date;
  submissions: Map<string, string>; // cardId -> answer
}

async function generateExam(
  deck: Card[],
  duration: number,
  difficulty: 'easy'|'medium'|'hard'
): Promise<Exam> {
  // Sample cards by difficulty
  // Balance Bloom levels
  // Set timer
}

function gradeExam(exam: Exam): ExamResult {
  // Score, time taken, weak areas
}
```

**Monetization Potential:** Pro feature - exam simulator
**Technical Complexity:** Medium (timer logic, grading)
**Priority:** P5
**Dependencies:** Grading infrastructure
**Estimated Effort:** 2 weeks

---

## RECOMMENDED PROTOTYPE SEQUENCE

### Phase 1: Quick Wins (1-2 weeks)
**Features:**
1. **Concept Clusters (P1)** - High value, extends existing code
2. **Bloom-Level Tagging (P1)** - Quick enhancement to existing schema
3. **Goal Planner (P1)** - Retention driver, algorithmic only

**Rationale:** All three leverage existing infrastructure, provide immediate user value, and require no external dependencies.

---

### Phase 2: Engagement Loop (2-3 weeks)
**Features:**
4. **Reflection Mode (P2)** - Retention and delight
5. **Dialogue Replay (P2)** - Low cost, high perceived value
6. **Learning Velocity Dashboard (P2)** - Analytics depth

**Rationale:** Build habit loop with post-session insights and historical tracking.

---

### Phase 3: Monetization Enablers (3-4 weeks)
**Features:**
7. **Sync & Backup (P4)** - Infrastructure for Pro tier
8. **Pro Features Paywall (P4)** - Revenue generation
9. **Concept Graph Visualization (P3)** - Premium differentiator

**Rationale:** Establish revenue stream with compelling Pro features.

---

## TECHNICAL DEPENDENCIES MATRIX

| Feature | Core Modules | Edge Functions | Database | External APIs | Complexity |
|---------|--------------|----------------|----------|---------------|------------|
| Concept Clusters | relations.ts | generate-flashcards | - | - | Medium |
| Bloom Tagging | cards.ts | generate-flashcards | - | - | Low |
| Goal Planner | scheduler.ts | - | - | - | Low |
| Reflection Mode | metrics.ts | ai-companion | - | - | Medium |
| Dialogue Replay | sessionStorage.ts | - | localStorage | - | Low |
| Velocity Dashboard | metrics.ts | - | - | - | Medium |
| Sync & Backup | storage.ts | - | Supabase tables | - | Medium |
| Paywall | - | stripe-webhook | user_subscriptions | Stripe | Medium |
| Graph Viz | relations.ts | - | - | D3.js | Medium |
| Document Mode | - | document-ingest | Storage | pdf-parse | High |
| Exam Simulator | - | exam-generator | - | - | Medium |

---

## MONETIZATION STRATEGY

### Free Tier
- Manual card creation (up to 100 cards/deck, 3 decks)
- Basic FSRS scheduling
- 10 AI questions per week
- Basic analytics (retention rate only)
- Local storage only

### Pro Tier ($9.99/month)
- Unlimited cards and decks
- Document ingestion (PDF, DOCX, MD)
- Unlimited AI companion questions
- Reflection mode (unlimited sessions)
- Advanced analytics (velocity, graph, forecasting)
- Cloud sync across devices
- Concept graph visualization
- Export to PDF/Anki
- Exam simulator
- Priority support

### Enterprise Tier ($49/month) - Future
- Team collaboration
- Shared curricula
- Admin dashboard
- SSO integration
- Bulk document processing
- API access

---

## NEXT STEPS

### Immediate Actions (Next Session)
1. **Implement Concept Clusters:**
   - Extend `relations.ts` with cluster detection
   - Add `sourceHash` to card generation
   - Create cluster-based study view

2. **Add Bloom Auto-Tagging:**
   - Update generate-flashcards prompt
   - Store Bloom level in card metadata
   - Display in card UI

3. **Build Goal Planner:**
   - Create scheduling algorithm
   - Add UI for time input + plan display
   - Integrate with existing study flow

### Documentation Updates
- README: Add feature list
- ARCHITECTURE: Document new modules
- API: Document new edge function endpoints

### Testing Requirements
- Unit tests for clustering algorithm
- Integration tests for Bloom tagging
- E2E test for goal planner flow

---

**End of Roadmap**
