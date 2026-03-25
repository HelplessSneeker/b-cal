# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

b-cal is a calendar application built as a Turborepo monorepo with pnpm workspaces. It consists of:

- **apps/web** (`@b-cal/web`) - Next.js 16 frontend with React 19
- **apps/api** (`@b-cal/api`) - NestJS 11 REST API with Prisma/PostgreSQL
- **packages/i18n** (`@b-cal/i18n`) - Shared i18n package with EN/DE locales

Node 24+ required (`engines` in root `package.json`).

See `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md` for detailed architecture documentation.

## Commands

From the monorepo root:

```bash
pnpm dev            # Start both web and API in watch mode
pnpm dev:web        # Start only the web frontend (port 8080)
pnpm dev:api        # Start only the API (port 3000)
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm test           # Run all tests (API unit + web integration)
pnpm format         # Format all packages (Prettier)
pnpm format:check   # Check formatting without fixing
pnpm prisma:studio  # Launch Prisma Studio (API)
pnpm services:up    # Start all Docker services (PostgreSQL + Redis)
pnpm services:down  # Stop all Docker services
pnpm db:up          # Start PostgreSQL only
pnpm db:down        # Stop PostgreSQL only
pnpm redis:up       # Start Redis only
pnpm redis:down     # Stop Redis only
```

From individual app directories (`apps/web/` or `apps/api/`):

```bash
pnpm dev          # Start that app in watch mode
pnpm build        # Build that app
pnpm lint         # Lint that app
```

API-specific commands (from `apps/api/`):

```bash
pnpm test                                    # Run unit tests
npx jest --testPathPatterns=<pattern>        # Run specific tests (pnpm test -- misparses the flag)
pnpm test:e2e                                # Run e2e tests (uses separate test database)
pnpm prisma:migrate                          # Apply database migrations
pnpm prisma:generate                         # Regenerate Prisma client
pnpm prisma:seed                             # Seed database with test data
```

## Docker

Both apps have multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`). A root `.dockerignore` excludes node_modules, build outputs, env files, and logs. `docker-compose.yml` defines all four services (postgres, redis, api, web) for local development.

- **API**: Node 24 Alpine, runs `prisma migrate deploy` then `node dist/src/main`, exposes port 3000, healthcheck on `/health`
- **Web**: Node 24 Alpine, uses Next.js standalone output, exposes port 8080, requires `NEXT_PUBLIC_BACKEND_URL` as a build arg, healthcheck on `/health`

## Architecture

**Authentication**: Cookie-based JWT auth (httpOnly cookies). Access tokens expire in 1h, refresh tokens in 30d. Email verification required after signup. The frontend implements silent token refresh on 401 with deduplication.

**Session Management**: `Session` model per login with device name (via `ua-parser-js`), IP address, and user agent. Max 5 sessions per user — oldest evicted. Refresh issues new access token only (no refresh token rotation).

**CSRF Protection**: Double-submit cookie pattern via `csrf-csrf`. Cookie name varies by environment. Frontend auto-fetches token via `GET /auth/csrf-token` and auto-retries on CSRF failures.

**i18n**: Shared `@b-cal/i18n` package with EN/DE locales and namespaces (common, auth, calendar, settings, error, success). Frontend uses `next-intl`, API uses `nestjs-i18n` with `AcceptLanguageResolver`.

**Recurring Calendar Entries**: Entries support DAILY, WEEKLY (with optional day selection), and MONTHLY recurrence. Virtual occurrences are expanded at query time from a parent entry + `RecurrenceException` records. Individual occurrences are referenced via synthetic IDs (`{parentUUID}:{ISO8601DateTime}`). Modifications support three scopes: SINGLE (upserts an exception), THIS_AND_FUTURE (splits the series), ALL (modifies the parent).

**Calendars**: Users can create up to 5 named calendars with custom colors (`Calendar` model). Calendar entries can optionally belong to a calendar via `calendarId`. Managed by `CalendarsModule` with full CRUD endpoints at `/calendars`.

**Email Reminders**: Calendar entries support configurable email reminders (`reminderType`, `reminderAmount`, `reminderUnit` fields). `ReminderModule` uses `@nestjs/schedule` to poll every 60s for due reminders, enqueues them via BullMQ, and sends emails through the mail queue. `ReminderSent` model tracks sent reminders for idempotency (auto-cleaned after 7 days).

**Database**: PostgreSQL via Prisma. Models: `User`, `Session`, `Calendar` (id, name, color, userId), `CalendarEntry` (with optional `recurrenceFrequency`, `recurrenceByDay`, `recurrenceUntil`, `calendarId`, `reminderType`, `reminderAmount`, `reminderUnit`), `RecurrenceException` (per-occurrence overrides/cancellations, unique on `calendarEntryId` + `originalDate`), `ReminderSent` (calendarEntryId, occurrenceDate — unique pair for idempotency), `UserPreferences` (language, timezone, theme, accentColor, weekStart).

**Redis**: Used for caching (`@nestjs/cache-manager` with `@keyv/redis`, 15min default TTL) and as the BullMQ job queue backend for async mail processing (3 retries with exponential backoff).

**Security**: Helmet (HSTS, strict CSP), per-request nonce CSP on the frontend, global rate limiting (60/60s default, 5/60s for auth, 3/5min for mail-sending), 1MB payload limit, Sentry with PII scrubbing, structured logging with sensitive field redaction.

**Pre-commit Hooks**: Husky runs lint-staged (ESLint + Prettier) and all tests on commit.

## Environment

**Web** (`apps/web/.env`): `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SENTRY_DSN` (optional).

**API** (`apps/api/.env`): `PORT`, `FRONTEND_URL`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_HOST`, `SECRET_KEY`, `REFRESH_SECRET_KEY`, `MAIL_SECRET_KEY`, `CSRF_SECRET` (all secrets require min 32 chars), `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` (mail settings required in production only), `MAIL_FROM` (optional), `REDIS_HOST`, `REDIS_PORT` (required), `REDIS_PASSWORD` (required in production only), `SENTRY_DSN` (optional), pool tuning: `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS` (all optional).

**API Test** (`apps/api/.env.test`): Same as above with `DB_NAME=b_cal_test`.

## CI/CD

GitHub Actions workflows (`.github/workflows/`):

- **build.yml** — Builds all packages on push to main and PRs to main
- **lint.yml** — Runs linting on push to main and PRs to main
- **test.yml** — Runs unit tests and e2e tests (spins up PostgreSQL 16 + Redis 7) on push to main and PRs to main
- **security.yml** — `pnpm audit` + Trivy filesystem scan on push to main, PRs to main, and weekly schedule
- **docker.yml** — Builds Docker images (without pushing) on push to main and PRs to main
- **release.yml** — Triggered by `v*` tags. Creates GitHub Release and deploys via Coolify webhook

## Sensitive Data Handling

Both apps scrub PII before sending to Sentry (`sentry-before-send.ts`). The API redacts sensitive fields in structured logs via pino redaction paths and custom request/response serializers.

## Test Users (after seeding)

- `alice@example.com` / `password123!` (email verified, preferences: en-US, America/New_York)
- `bob@example.com` / `password123!` (email verified, preferences: de-DE, Europe/Berlin)

## Design Context

**Users**: Individuals managing personal schedules, appointments, and reminders. They expect a fast, reliable, immediately familiar calendar app with no learning curve.

**Brand Personality**: Bold, modern, confident. The interface communicates competence through crisp execution rather than visual noise.

**Aesthetic Direction**: Classic & professional with elevated craft. Google Calendar is the primary reference for layout conventions and information hierarchy, but b-cal should feel more intentional — sharper typography (Geist), more deliberate spacing, and confident use of accent colors. Modern without being trendy.

**Design Principles**:
1. **Familiar first, then better** — Follow established calendar UX patterns. Users shouldn't think about how the app works, but should notice it feels better.
2. **Confidence through clarity** — Strong typographic hierarchy, decisive spacing, purposeful color. Every element placed with intent.
3. **Respect the user's choices** — Accent colors, themes, and language are first-class. Design should amplify, never fight, customization.
4. **Density without clutter** — Embrace information density with clean alignment and consistent rhythm.
5. **Accessible by default** — WCAG AA baseline. Focus states, keyboard navigation, and semantic HTML are non-negotiable.

**Anti-patterns**: Overly playful/whimsical UIs, cluttered dashboards, skeuomorphic elements.

**Stack**: Tailwind CSS v4 (OKLch tokens), shadcn/ui (new-york), Radix UI, Geist fonts, next-themes, CVA, lucide-react. See `.impeccable.md` for the full design context document.
