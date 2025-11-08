# Changelog

All notable changes to StudyFlash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-10-29

### Added - Production Hardening & P2 Features
#### Core Features (P2)
- **Reflection Mode**: AI-generated learning summaries at end of study sessions
  - Analyzes session performance (cards reviewed, ratings, time spent)
  - Provides structured feedback: summary, strengths, weaknesses, next steps
  - Saves reflections to localStorage for future analytics
  - `ReflectionModal` component with color-coded sections
- **Adaptive Difficulty**: Dynamic FSRS difficulty adjustment based on performance and Bloom level
  - Increases difficulty (+0.1) for struggles with basic concepts (Bloom ≤ Understand, rating 1-2)
  - Decreases difficulty (-0.1) for easy recall of complex concepts (Bloom ≥ Apply, rating 4)
  - Clamped to FSRS standard range (1.3-3.0)
  - Debug logging when `VITE_DEBUG_MODE=true`

#### Edge Functions
- `reflection-mode`: Full implementation with OpenAI integration (temp 0.4, JSON mode)
- `adaptive-rewrite`: Stub endpoint for P3 development

#### Configuration & Infrastructure
- **Centralized Config**: `src/config.ts` for all environment variables and feature flags
- **Enhanced TypeScript**: Added `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`
- **Comprehensive Scripts**: Added `qa`, `qa:fix`, `analyze`, `smoke`, `audit`, `validate`
- **Local Storage Schema Versioning**: `LOCAL_STORAGE_SCHEMA_VERSION = 2` for migrations

#### Documentation
- **SECURITY.md**: Threat model, vulnerability reporting, security best practices
- **CONTRIBUTING.md**: Development workflow, coding standards, release process
- **CHANGELOG.md**: Release notes and version history (this file)
- **Enhanced README**: Complete local dev and production deployment instructions

### Changed
- **Session Tracking**: Added session stats (cards reviewed, ratings, start time) for reflection generation
- **handleRating**: Now calls `adjustDifficulty` after `repeatCard` for adaptive difficulty
- **Package.json**: Reorganized scripts for better QA workflow
- **Biome Config**: Enhanced linting rules for stricter code quality

### Fixed
- **Duplicate Keys**: Fixed React key warnings in `CompanionChat` weak cards list
- **Date Serialization**: Proper ISO string conversion for `lastReview` and `due` fields in edge function payloads
- **Type Safety**: Eliminated implicit `any` types across codebase

### Security
- **Rate Limiting**: Naive in-memory 3 req/min/IP for all edge functions
- **Input Validation**: Zod schemas for all edge function inputs and outputs
- **CORS Hardening**: Dynamic `Access-Control-Allow-Origin` with `Vary: Origin` header
- **Secrets Management**: No API keys in logs or client-side code
- **Supply Chain**: Locked dependencies with package-lock.json

## [0.2.0] - 2025-10-28

### Added - P1 Features
#### Concept Clusters
- Automatic grouping of related cards from same source paragraph
- `ClusterView` component with statistics and cluster-specific study sessions
- `sourceHash`, `sourceContext`, `clusterId` metadata fields in `CardExtended` schema

#### Bloom Taxonomy Auto-Tagging
- AI-generated Bloom level classification (Remember → Create)
- Color-coded badges in card UI (blue → purple spectrum)
- Bloom level consideration in adaptive difficulty and analytics

#### Daily Goal Planner
- Time-based study plan generation (`GoalPlanner` component)
- Priority algorithm: learning/relearning > overdue > due today > new cards
- Session breakdown by urgency with estimated time per card (30s)
- `src/core/scheduler.ts` with planning algorithms

#### Analytics Dashboard
- Retention rate by category (bar chart)
- 7-day forecast (line chart)
- Streak metrics: current streak, longest streak, total days studied
- Bloom distribution and deck statistics

#### AI Companion
- Weak card analysis and personalized quiz questions
- Semantic answer grading with embeddings (fallback to Jaccard similarity)
- `CompanionChat` component with two-pane layout
- FSRS updates based on answer correctness

### Changed
- **Schema Extension**: `CardExtended` adds optional fields for P1 features
- **Edge Function**: `generate-flashcards` now extracts paragraphs and attaches metadata
- **Core Modules**: Added `src/core/cards.ts`, `metrics.ts`, `relations.ts`, `scheduler.ts`

### Fixed
- Type guards (`isFSRSCard`, `isCardExtended`) for safe schema migrations
- Backward compatibility for cards without P1 metadata

## [0.1.0] - 2025-10-28 (Initial Release)

### Added
- Basic flashcard generation from text using OpenAI
- FSRS (Free Spaced Repetition Scheduler) integration
- Study mode with 4-button rating system (Again, Hard, Good, Easy)
- Card review queue with due date tracking
- Local storage persistence (deck, FSRS data, proposed cards)
- CSV and JSON export/import
- Supabase authentication integration
- User profile management
- Toast notifications
- Responsive Tailwind CSS design

### Edge Functions
- `generate-flashcards`: Text → flashcards via OpenAI
- CORS support with `OPTIONS` preflight handling
- Retry logic with exponential backoff (3 attempts)

---

## Release Notes

### [0.3.0] - Production Hardening
This release focuses on production readiness:
- **P2 Features**: Reflection Mode and Adaptive Difficulty
- **Security**: Comprehensive threat model and security documentation
- **Quality**: Strict TypeScript, enhanced linting, comprehensive QA scripts
- **Documentation**: Complete developer onboarding and contribution guidelines

### [0.2.0] - P1 Feature Completion
Major cognitive learning enhancements:
- **Concept Clusters**: Context-aware card grouping
- **Bloom Taxonomy**: Cognitive level tracking
- **Goal Planner**: Time-based study planning
- **Analytics**: Retention forecasting and streak tracking
- **AI Companion**: Personalized study assistance

### [0.1.0] - MVP Launch
Initial release with core flashcard functionality and FSRS scheduling.

---

## Migration Guide

### 0.2.0 → 0.3.0
- No breaking changes
- New optional features (Reflection Mode, Adaptive Difficulty) enabled by default
- Existing localStorage data compatible
- Consider enabling `VITE_DEBUG_MODE=true` during development for enhanced logging

### 0.1.0 → 0.2.0
- No breaking changes
- Existing cards automatically migrated to `CardExtended` schema via type guards
- P1 features (Clusters, Bloom, Analytics) opt-in via UI tabs
- FSRS data preserved across migration

---

## Upgrade Instructions

### Client (Vite App)
```bash
git pull origin main
npm install
npm run build
# Deploy dist/ to your hosting provider
```

### Edge Functions
```bash
supabase functions deploy reflection-mode
supabase functions deploy adaptive-rewrite
# Update generate-flashcards if needed
supabase functions deploy generate-flashcards
```

### Environment Variables
Update `.env` with new P2 variables (see `.env.example`):
```bash
VITE_ENABLE_REFLECTION=true
VITE_ENABLE_ADAPTIVE_DIFFICULTY=true
VITE_DEBUG_MODE=false
```

---

**Full Changelog**: https://github.com/your-org/studyflash/compare/v0.2.0...v0.3.0
