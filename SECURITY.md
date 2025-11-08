# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3.0 | :x:                |

## Threat Model

StudyFlash is a client-side flashcard application with server-side AI generation via Supabase Edge Functions. The security model addresses these key areas:

### 1. Client-Side Security
- **Local Storage**: Deck data and FSRS progress stored in browser localStorage
  - Risk: Data accessible to any script on same origin
  - Mitigation: No PII or sensitive data stored; user-generated content only
- **XSS Prevention**: React's built-in escaping protects against XSS
  - Risk: User-generated card content could contain malicious scripts
  - Mitigation: All content rendered through React (auto-escaped), no `dangerouslySetInnerHTML`

### 2. API Security (Edge Functions)
- **Edge Rate Limiting via Postgres RPC**: Persistent rate limiting stored in database
  - Configurable via `RATE_LIMIT` environment variable (default: 60 req/min)
  - Per-IP tracking with automatic expiration
  - Prevents abuse of OpenAI API quota
  - Returns HTTP 429 with JSON error message and retry-after header
- **CORS via CORS_ORIGINS env**: Multi-origin support from `CORS_ORIGINS` environment variable
  - Comma-separated list of allowed origins
  - Prevents unauthorized origins from calling edge functions
  - Includes `Vary: Origin` header for cache correctness
  - Dynamic origin validation against whitelist
- **Input Validation**: Zod schemas validate all inputs
  - Prevents malformed data from reaching OpenAI API
  - Returns HTTP 400 with structured error messages

### 3. Secrets Management
- **API Keys**: OpenAI API key stored in Supabase environment variables
  - Never exposed to client
  - Never logged or echoed in responses
- **Anon Key**: Supabase anon key is public by design (RLS enforced on server)

### 4. Supply Chain Security
- **Dependency Audits**: Run `npm audit` regularly
  - All dependencies pinned in package-lock.json
  - Review advisories before updates
- **No Postinstall Scripts**: Package.json forbids postinstall hooks except whitelisted

### 5. Known Limitations
- **localStorage Limit**: 5-10MB per origin; large decks may hit limit
- **Client-Side Validation**: Can be bypassed; server-side validation required for sensitive operations
- **Rate Limiting**: In-memory; resets on function cold start; IP-based (can be bypassed with VPN)

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead:
1. Email security@studyflash.app (or create a private GitHub Security Advisory)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Response time: We aim to respond within 48 hours

## Security Best Practices for Deployment

### Production Environment Variables
```bash
# Never commit these to git
OPENAI_API_KEY=sk-...
ALLOWED_ORIGIN=https://your-domain.com
```

### Supabase Edge Functions
- Enable RLS (Row Level Security) for all tables if using database
- Set `ALLOWED_ORIGIN` to your production domain
- Monitor function logs for unusual patterns
- Enable rate limiting at Supabase project level

### Client Build
- Run `npm audit` before every deployment
- Use `npm run qa` to validate build before production
- Enable CSP (Content Security Policy) headers via hosting provider

## Incident Response

If a security incident is confirmed:
1. **Contain**: Disable affected edge functions immediately
2. **Assess**: Determine scope and impact
3. **Remediate**: Deploy fix and rotate any compromised secrets
4. **Notify**: Inform affected users if PII was exposed (N/A for current version)
5. **Post-Mortem**: Document incident and prevention measures

## Security Checklist for Contributors

Before submitting a PR:
- [ ] No secrets committed (check with `git diff`)
- [ ] Input validation added for new edge functions
- [ ] Rate limiting considered for new endpoints
- [ ] No `dangerouslySetInnerHTML` or `eval()`
- [ ] Dependencies added only if necessary
- [ ] `npm audit` passes (or advisories documented)

## Contact

For security concerns: security@studyflash.app
For general questions: https://github.com/your-org/studyflash/issues
