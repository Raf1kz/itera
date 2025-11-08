# Contributing to StudyFlash

Thank you for your interest in contributing to StudyFlash! This document provides guidelines and workflows for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project and community

## Getting Started

### Prerequisites
- Node.js 20+ (LTS recommended)
- npm 10+ or pnpm 8+
- Supabase CLI (for local edge function development)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/studyflash.git
   cd studyflash
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run Supabase functions locally** (optional)
   ```bash
   supabase functions serve
   ```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/[name]` - New features
- `fix/[name]` - Bug fixes
- `chore/[name]` - Maintenance tasks

### Commit Message Format
Follow Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semi-colons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Tooling, dependencies, configuration

Example:
```
feat(companion): add semantic answer grading with embeddings

Implements embedding-based grading using OpenAI text-embedding-3-small
with fallback to Jaccard similarity for offline scenarios.

Closes #42
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation

3. **Run quality checks**
   ```bash
   npm run qa:fix  # Auto-fix formatting and linting
   npm run qa      # Full validation
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-new-feature
   ```
   Then open a PR on GitHub against `develop` branch.

6. **PR Requirements**
   - [ ] All CI checks pass (lint, typecheck, tests, build)
   - [ ] Code reviewed by at least one maintainer
   - [ ] Documentation updated (if applicable)
   - [ ] CHANGELOG.md updated (for user-facing changes)
   - [ ] No merge conflicts with target branch

## Coding Standards

### TypeScript
- **Strict mode**: All code must pass `tsc --noEmit` with strict flags
- **Type inference**: Prefer type inference over explicit types where clear
- **`any` forbidden**: Use `unknown` and type guards instead
- **No `@ts-ignore`**: Use `@ts-expect-error` with explanation if absolutely necessary

### React
- **Functional components**: Use function components and hooks (no class components)
- **Hooks rules**: Follow Rules of Hooks (linter enforces this)
- **Key props**: Always provide stable keys for lists
- **Prop types**: Explicit interface for all component props

### File Organization
```
src/
├── components/       # React components (one component per file)
├── core/             # Pure business logic (no React, no side effects)
├── utils/            # Utility functions
├── contexts/         # React contexts
├── schemas.ts        # Zod schemas and types
├── config.ts         # Centralized configuration
└── App.tsx           # Main application component
```

### Naming Conventions
- **Files**: PascalCase for components (`UserProfile.tsx`), camelCase for utils (`export.ts`)
- **Functions**: camelCase (`getUserName`, `buildStudyQueue`)
- **Components**: PascalCase (`UserProfile`, `ReflectionModal`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DECK_SIZE`, `DEBUG_MODE`)
- **Types/Interfaces**: PascalCase (`FSRSCard`, `SessionStats`)

### Code Style
- **Line length**: 100 characters (enforced by Biome)
- **Quotes**: Single quotes for strings (enforced by Biome)
- **Semi-colons**: Required (enforced by Biome)
- **Trailing commas**: Multi-line objects/arrays (enforced by Biome)

## Testing

### Running Tests
```bash
npm run test          # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Writing Tests
- **Unit tests**: `*.test.ts` next to source file
- **Test naming**: `describe` for feature, `it` for behavior
- **Coverage**: Aim for >80% coverage on core logic
- **Mocking**: Minimize mocks; prefer integration tests

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { adjustDifficulty } from './cards';

describe('adjustDifficulty', () => {
  it('increases difficulty for low-bloom struggles', () => {
    const card = { difficulty: 2.0, /* ... */ };
    const result = adjustDifficulty(card, 1, 'remember');
    expect(result.difficulty).toBe(2.1);
  });
});
```

## Edge Function Development

### Local Testing
```bash
# Start Supabase functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text": "Test content"}'
```

### Deployment
```bash
# Deploy single function
supabase functions deploy generate-flashcards

# Deploy all functions
supabase functions deploy
```

### Edge Function Checklist
- [ ] Zod validation for inputs and outputs
- [ ] CORS headers with `Vary: Origin`
- [ ] Rate limiting (3 req/min/IP)
- [ ] Error taxonomy and structured errors
- [ ] Telemetry logging (JSON format)
- [ ] Input truncation (max 16k chars)
- [ ] Timeout handling (20s max)
- [ ] No secrets in logs or responses

## Documentation

### What to Document
- **Public APIs**: All exported functions must have JSDoc
- **Complex logic**: Explain "why", not just "what"
- **Breaking changes**: Must be documented in CHANGELOG.md
- **New features**: Update README.md with usage examples

### JSDoc Example
```typescript
/**
 * Adjust FSRS difficulty based on performance and Bloom level
 *
 * @param fsrsCard - FSRS card to adjust
 * @param rating - User rating (1=again, 2=hard, 3=good, 4=easy)
 * @param bloomLevel - Optional Bloom taxonomy level
 * @returns Updated FSRS card with adjusted difficulty
 *
 * @example
 * const adjusted = adjustDifficulty(card, 1, 'remember');
 * console.log(adjusted.difficulty); // Increased by 0.1
 */
export function adjustDifficulty(/* ... */) { /* ... */ }
```

## Release Process

1. **Update version** in `package.json` (semantic versioning)
2. **Update CHANGELOG.md** with all changes since last release
3. **Run full QA**: `npm run qa`
4. **Create release tag**: `git tag -a v0.3.0 -m "Release v0.3.0"`
5. **Push tag**: `git push origin v0.3.0`
6. **Deploy edge functions**: `supabase functions deploy`
7. **Deploy frontend**: (hosting provider specific)

## Getting Help

- **Documentation**: Check README.md and in-code comments
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community (link)

## Recognition

Contributors are recognized in:
- CHANGELOG.md (for significant contributions)
- GitHub contributors page
- Annual contributor spotlight (blog post)

Thank you for contributing to StudyFlash! 🎉
