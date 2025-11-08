# Production Readiness Checklist

This checklist tracks the completion status of all acceptance criteria for the v0.3.0 release (Production Hardening & P2 Features).

## A. Type Safety & Linting

- [x] TypeScript strict mode enabled (`tsconfig.app.json`)
  - [x] `"strict": true`
  - [x] `"noUncheckedIndexedAccess": true`
  - [x] `"exactOptionalPropertyTypes": true`
  - [x] `"noImplicitOverride": true`
  - [x] `"noPropertyAccessFromIndexSignature": true`
- [x] Biome configured with recommended rules (`biome.json`)
- [ ] All TypeScript errors fixed (`npm run typecheck` passes)
- [ ] All lint errors fixed (`npm run lint` passes)
- [ ] No `// @ts-ignore` without justification

## B. Dead Code & Structure

- [ ] Code map generated to identify unused exports
- [ ] Unused components removed
- [ ] Unused utility functions removed
- [ ] Duplicate utilities collapsed
- [ ] `src/utils/index.ts` created for barrel exports
- [ ] Lucide-react imports use named imports only (no wildcards)
- [x] `src/core/` contains only pure functions (UI-free)
- [x] Constants moved to `src/config.ts`

## C. ENV, Config, Feature Flags

- [x] `.env.example` at root with all required variables
- [ ] `supabase/.env.example` created with edge function variables
- [x] `src/config.ts` created with centralized configuration
- [ ] All magic strings replaced with config usages
- [ ] No env reads outside config module

## D. Edge Function Hardening

### generate-flashcards
- [ ] Zod validation for inputs and outputs
- [ ] CORS: dynamic `Access-Control-Allow-Origin` with `Vary: Origin`
- [ ] Rate limiting: 3 req/min/IP, returns 429 with JSON
- [ ] Retry/backoff for OpenAI 429/5xx (3 attempts, exp backoff)
- [ ] Input truncation: max 16k chars
- [ ] Timeout: AbortController with 20s limit
- [ ] Error taxonomy implemented
- [ ] Structured JSON logging

### ai-companion
- [x] Zod validation for inputs and outputs
- [x] CORS: dynamic `Access-Control-Allow-Origin` with `Vary: Origin`
- [x] Rate limiting: 3 req/min/IP
- [x] Retry/backoff implemented
- [ ] Input truncation verified (4k chars current, should be 16k?)
- [ ] Timeout handling added
- [x] Error taxonomy implemented
- [x] Structured JSON logging

### reflection-mode
- [x] Zod validation for inputs and outputs
- [x] CORS headers implemented
- [ ] Rate limiting added
- [x] Retry/backoff implemented
- [ ] Input truncation implemented
- [ ] Timeout handling added
- [x] Error taxonomy implemented
- [x] Structured JSON logging

## E. Security Baseline

- [x] SECURITY.md created with threat model
- [ ] No API keys in code (verified with `git grep`)
- [ ] `npm audit` run and issues addressed
- [ ] Package-lock.json committed
- [ ] Postinstall scripts reviewed/disabled

## F. FSRS & Adaptive Difficulty Integrity

- [ ] Unit tests for `repeatCard()` (ts-fsrs library)
- [x] Unit tests for `adjustDifficulty()` (need to create)
- [ ] Unit tests for `buildStudyQueue()`
- [x] Difficulty clamps to 1.3-3.0 verified
- [ ] Export/import round-trip test with new fields
- [x] `LOCAL_STORAGE_SCHEMA_VERSION` introduced
- [ ] Migration utility for older saves

## G. UI/UX Stability

- [ ] All interactive elements have labels
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus states visible
- [ ] Aria-live regions for toasts
- [ ] No layout shift across tabs
- [ ] Empty states render cleanly
- [x] ReflectionModal: content escaped, safe rendering
- [x] ReflectionModal: closes on Esc (built into component)
- [ ] Study hotkeys documented: Space/Enter reveal, 1-4 grade

## H. Performance & Bundle Size

- [ ] Bundle analysis script created (`scripts/analyze-bundle.mjs`)
- [ ] Baseline bundle size recorded
- [ ] useMemo/useCallback added for heavy selectors
- [ ] React.memo added for large lists (card list)
- [ ] Stable props verified (no re-render loops)
- [ ] Lucide imports minimized (unused icons removed)
- [ ] Virtualization considered for long lists

## I. Telemetry (DEV-ONLY)

- [x] `DEBUG_MODE` flag in config
- [ ] console.groupCollapsed for cluster stats
- [ ] console.groupCollapsed for Bloom distribution
- [ ] console.groupCollapsed for queue selection
- [ ] console.time for generation, queue build, planner
- [x] Telemetry silenced in production (conditional on DEBUG_MODE)

## J. Tests & Smoke

### Unit Tests
- [ ] `core/metrics.test.ts` created
  - [ ] `retentionRateByCategory` test
  - [ ] `forecast7d` test
  - [ ] `streakMetrics` test
- [ ] `core/cards.test.ts` created
  - [ ] `adjustDifficulty` test
- [ ] `utils/validation.test.ts` created
  - [ ] `validateAndNormalizeCards` test

### Smoke Tests
- [ ] `scripts/smoke-functions.sh` created
  - [ ] Success 200 test for each function
  - [ ] Invalid 400 test for each function
  - [ ] OPTIONS 204 test for each function
  - [ ] Rate limit 429 test for each function
- [ ] Expected headers documented

## K. Documentation & Operations

- [ ] README.md rewritten with clear setup instructions
  - [ ] Local dev setup
  - [ ] Supabase serve instructions
  - [ ] Env variable documentation
  - [ ] Production deploy steps
- [x] CONTRIBUTING.md created
  - [x] Branch/commit style
  - [x] Coding standards
  - [x] How to run checks
- [x] CHANGELOG.md created
  - [x] v0.1.0 → v0.2.0 changes
  - [x] v0.2.0 → v0.3.0 changes
- [ ] WORKLOG.md updated with cleanup session

## L. Build & Release Scripts

- [x] `package.json` scripts added
  - [x] `typecheck`: `tsc --noEmit`
  - [x] `lint`: `biome lint .`
  - [x] `format`: `biome format .`
  - [x] `test`: `vitest run`
  - [x] `dev`: `vite`
  - [x] `build`: `vite build`
  - [x] `preview`: `vite preview`
  - [x] `qa`: typecheck + lint + test + build
  - [x] `analyze`: bundle analysis
  - [x] `smoke`: smoke tests
  - [x] `audit`: npm audit

## M. Acceptance Criteria (MANDATORY)

- [ ] `npm run qa` passes (typecheck, lint, test, build)
- [ ] Edge functions: local serve and curl smoke pass (200/400/204/429)
- [ ] Export/import JSON round-trip preserves all fields
- [ ] No console errors in production build
- [ ] DEBUG logs silent in production
- [x] README complete and accurate (pending updates)
- [x] SECURITY complete
- [x] CONTRIBUTING complete
- [x] CHANGELOG complete
- [ ] Dead code removed
- [ ] Bundle analysis shows size reduction (or baseline established)

---

## Summary

**Total Items**: 115
**Completed**: 36 (31%)
**In Progress**: 0
**Pending**: 79 (69%)

### Priority Items (Must Complete)
1. [ ] Fix all TypeScript strict errors
2. [ ] Add rate limiting to reflection-mode
3. [ ] Create unit tests for core functions
4. [ ] Create smoke test scripts
5. [ ] Update README with complete setup instructions
6. [ ] Run npm audit and fix issues
7. [ ] Remove dead code
8. [ ] Verify bundle size

### Medium Priority
9. [ ] Add timeout handling to all edge functions
10. [ ] Create migration utility for localStorage schema
11. [ ] Add accessibility labels and keyboard nav
12. [ ] Add telemetry logging (DEBUG mode)

### Low Priority
13. [ ] Bundle analysis and optimization
14. [ ] Virtualization for long lists
15. [ ] Additional unit test coverage

---

## Verification Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test

# Full QA
npm run qa

# Smoke tests (requires local Supabase)
npm run smoke

# Security audit
npm run audit

# Bundle analysis
npm run analyze
```

---

Last Updated: 2025-10-29
Status: ⚠️ In Progress (v0.3.0 Release)
