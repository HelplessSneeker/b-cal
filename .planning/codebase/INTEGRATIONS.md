# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Error Tracking:**
- Sentry (`@sentry/nestjs` 10.38.0 on API, `@sentry/nextjs` 10.38.0 on web)
  - API: Initialized in `apps/api/src/instrument.ts`, captures unhandled rejections and exceptions
  - Web: Configured in `apps/web/sentry.server.config.ts` and `apps/web/sentry.edge.config.ts`
  - PII scrubbing: `apps/api/src/sentry-before-send.ts` (emails, tokens, cookies redacted), `apps/web/sentry.before-send.ts`
  - Optional: configured via `SENTRY_DSN` env var (both apps)
  - Web: Uses `/monitoring` tunnel route to circumvent ad-blockers; `widenClientFileUpload: true`; traces sample rate 0.2 (production), 1.0 (dev)

## Data Storage

**Databases:**
- PostgreSQL 16-alpine (primary data store)
  - Connection via Prisma Client (`@prisma/client` 7.3.0)
  - Adapter: `@prisma/adapter-pg` 7.3.0
  - Env vars: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_HOST`
  - Docker service: `postgres` in `docker-compose.yml` on port 5432
  - Schema: `apps/api/prisma/schema.prisma`
  - Models: User, Session, Calendar, CalendarEntry, RecurrenceException, ReminderSent, UserPreferences

**Caching:**
- Redis 7-alpine (cache backend + job queue)
  - Cache manager: `@nestjs/cache-manager` 3.1.0 with Keyv adapter (`@keyv/redis` 5.1.6)
  - Default TTL: 15 minutes
  - Connection: `REDIS_HOST`, `REDIS_PORT` (required), `REDIS_PASSWORD` (production only)
  - Docker service: `redis` in `docker-compose.yml` on port 6379
  - Persistence: Enabled via `redis-server --appendonly yes`

**Job Queue:**
- BullMQ 5.71.0 with Redis backend
  - Framework: `@nestjs/bullmq` 11.0.4
  - Queues:
    - **Mail Queue** (`MailModule`): Async email sending via `nodemailer` (signup verification, password reset, calendar reminders)
    - **Reminder Queue** (`ReminderModule`): Email reminder scheduling and dispatch
  - Processor pattern: `MailProcessor` and `ReminderProcessor` consume jobs
  - Retry strategy: 3 retries with exponential backoff (mail queue)
  - Scheduler: `ReminderService` uses `@nestjs/schedule` to poll every 60 seconds for due reminders

## Authentication & Identity

**Auth Provider:**
- Custom (cookie-based JWT)
  - Implementation: `LocalStrategy` + `JwtStrategy` (Passport.js via `@nestjs/passport`)
  - Access tokens: 1 hour expiry, stored in `access_token` httpOnly cookie
  - Refresh tokens: 30 days expiry, stored in `refresh_token` httpOnly cookie
  - Password hashing: bcrypt (10 rounds)
  - Session model: `Session` per login, tracks device name (via `ua-parser-js`), IP, user agent, max 5 per user (oldest evicted)
  - Email verification required: `EmailVerifiedGuard` on protected endpoints
  - Token refresh: Silent refresh on 401 with promise deduplication (web frontend)

**CSRF Protection:**
- Double-submit cookie via `csrf-csrf` 4.0.3
  - Cookie name varies by environment: `csrf-token` (dev), `__Host-csrf-token` or `__Secure-csrf-token` (production)
  - Cookie options: `sameSite: 'lax'`, `httpOnly: true`, `secure` (production only)
  - Token passed via `X-Csrf-Token` header
  - Frontend auto-fetches via `GET /auth/csrf-token`, auto-retries on 403 failures
  - Implemented in `apps/api/src/csrf/csrf.config.ts`

## Mail Integration

**Email Service:**
- Nodemailer 8.0.0
  - Configuration: `apps/api/src/mail/mail.service.ts`
  - Transport: SMTP via `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`
  - From address: `MAIL_FROM` env var (optional, defaults to MAIL_USER)
  - Emails: Signup verification, password reset, calendar entry reminders
  - Asynchronous: Enqueued via BullMQ with retry logic
  - HTML templates: Accent color and theme palette support (light/dark)

## Rate Limiting

**Implementation:**
- `@nestjs/throttler` 6.5.0 with two throttle configurations:
  - **Default:** 60 requests per 60 seconds
  - **Auth endpoints** (sign up, login, password reset): 5 requests per 60 seconds
  - **Mail sending** (resend verification, forgot password): 3 requests per 5 minutes (cumulative with default limit)
  - Applied globally via `APP_GUARD`

## Security Headers

**Helmet 8.1.0:**
- HSTS: max-age 1 year, includeSubDomains, preload
- Content Security Policy (strict):
  - `default-src 'self'`
  - `script-src 'self'` + `'unsafe-inline'` (dev only)
  - `style-src 'self'` + `'unsafe-inline'` (dev only)
  - `img-src 'self'` + `data:` (dev only)
  - `connect-src 'self'`
  - `font-src 'self'`
  - `object-src 'none'`
  - `frame-ancestors 'none'`
- Applied in `apps/api/src/main.ts` via helmet middleware

## CORS

**Configuration:**
- Origin: `FRONTEND_URL` env var
- Credentials: true (allows cookies in cross-origin requests)
- Configured in `apps/api/src/main.ts`

## Request/Response

**Payload Limits:**
- JSON: 1MB
- URL-encoded: 1MB
- Middleware: Express `json()`, `urlencoded()` in `apps/api/src/main.ts`

**Request ID Tracking:**
- `X-Request-Id` header auto-generated if not provided
- Included in structured logs and error responses
- Used by GlobalExceptionFilter for traceability

## Internationalization

**i18n Provider:**
- Shared `@b-cal/i18n` package (workspace dependency)
- Framework: `next-intl` 4.8.3 (web), `nestjs-i18n` 10.6.0 (API)
- Locales: EN, DE
- Namespaces: common, auth, calendar, settings, error, success
- API locale detection: `AcceptLanguageResolver` from Accept-Language header (fallback: en)
- Web locale: Persisted in cookie, resolved per request via `next-intl/plugin`

## Logging & Monitoring

**Structured Logging:**
- Pino via `nestjs-pino` 4.5.0
- Custom serializers in `apps/api/src/common/logging/pino-serializers.ts`
  - Redacts sensitive headers: Authorization, Set-Cookie, Cookie, Csrf-Token
  - Redacts sensitive query params: token, resetToken, verificationToken, password
- Request/response serialization with PII redaction

**Health Checks:**
- `@nestjs/terminus` 11.0.0
- Endpoint: `GET /health` (checks Prisma and Redis)
- Custom `RedisHealthIndicator` in `apps/api/src/health/health.module.ts`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Email reminders (asynchronous, not webhooks)

## CI/CD & Deployment

**Hosting:**
- Docker-based (local dev via `docker-compose.yml`)
- Production: Implied multi-container deployment (API + Web separate)
- API startup: Runs `prisma migrate deploy` before app start

**CI Pipeline:**
- GitHub Actions workflows in `.github/workflows/`:
  - `build.yml` — Builds all packages (push to main, PRs)
  - `lint.yml` — Linting (push to main, PRs)
  - `test.yml` — Unit + e2e tests with PostgreSQL 16, Redis 7 (push to main, PRs)
  - `security.yml` — `pnpm audit` + Trivy scan (push, PRs, weekly)
  - `docker.yml` — Docker image builds (push to main, PRs)
  - `release.yml` — Triggered by `v*` tags; creates GitHub Release and deploys via Coolify webhook

---

*Integration audit: 2026-03-30*
