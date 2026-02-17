# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

b-cal is a calendar application built as a Turborepo monorepo with pnpm workspaces. It consists of:

- **apps/web** (`@b-cal/web`) - Next.js 16 frontend with React 19
- **apps/api** (`@b-cal/api`) - NestJS 11 REST API with Prisma/PostgreSQL

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
docker compose up -d                         # Start PostgreSQL
```

## Docker

Both apps have multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`). A root `.dockerignore` excludes node_modules, build outputs, env files, and logs.

- **API**: Node 22 Alpine, runs `node dist/src/main`, exposes port 3000, includes a healthcheck on `/health`
- **Web**: Node 22 Alpine, uses Next.js standalone output, exposes port 8080. Requires `NEXT_PUBLIC_BACKEND_URL` as a build arg.

## Architecture

**Authentication**: Cookie-based JWT auth (httpOnly cookies, not Bearer headers). Access tokens expire in 1h, refresh tokens in 7d. Email verification is required after signup — unverified users are redirected to `/check-email`. Password reset is supported via email with 1h token expiry. Both refresh tokens and reset tokens are bcrypt-hashed before storage. The frontend implements silent token refresh — on 401 responses, the client automatically attempts a token refresh and retries the original request, with deduplication to prevent concurrent refresh calls.

**CSRF Protection**: Double-submit cookie pattern via `csrf-csrf`. The API sets an httpOnly CSRF cookie (`__Host-csrf-token` in production, `csrf-token` in development) and validates the `x-csrf-token` header on state-changing requests. The frontend fetches a CSRF token on mount via `GET /auth/csrf-token` and auto-retries on CSRF failures.

**Frontend State**: Zustand stores for user state and calendar state (view mode, entries, modals).

**API Structure**: NestJS modules (AuthModule, UserModule, CalendarModule, PrismaModule, MailModule, HealthModule). Swagger docs at `/api` (development only — disabled in production).

**Error Monitoring**: Sentry integration (`@sentry/nestjs`) with a custom `GlobalExceptionFilter` that captures unexpected errors and sends them to Sentry. HTTP exceptions are returned normally without being reported.

**Health Checks**: `GET /health` endpoint via `@nestjs/terminus` — monitors database connectivity, heap memory (150MB threshold), and disk usage (90% threshold).

**Security Headers**: Helmet middleware on the API (HSTS with 1-year max-age, strict CSP). Frontend sets `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` via Next.js headers config. Clickjacking protection is via CSP `frame-ancestors 'none'` set in `proxy.ts`.

**CSP**: The frontend `proxy.ts` generates a per-request nonce and sets a strict Content-Security-Policy header (script-src with nonce + strict-dynamic, frame-ancestors none, object-src none). In production, it also adds `upgrade-insecure-requests`.

**Pre-commit Hooks**: Husky runs lint-staged (ESLint + Prettier) and tests on commit.

**Rate Limiting**: Global throttling via `@nestjs/throttler` (60 requests per 60 seconds). Auth endpoints (login, signup, forgot-password, reset-password, resend-verification) are stricter at 5 requests per 60 seconds.

**Environment Validation**: Runtime validation of all required environment variables on startup via class-validator. Mail settings are only required in production.

**Logging**: Structured logging via `nestjs-pino`. Pretty-printed in development, JSON in production. Each request is tagged with an `X-Request-Id` header (auto-generated via `randomUUID()` if not provided by the client). Request IDs are included in log entries and error responses for traceability.

**Input Validation**: Global payload limit of 1MB (JSON + URL-encoded). DTO string fields have max length constraints (title: 255, content: 5000, email: 254, password: 128).

**Database**: PostgreSQL via Prisma. Models: User (with emailVerified, verificationToken, resetToken, createdAt, updatedAt fields), CalendarEntry (with createdAt, updatedAt). Indexes on User.email, CalendarEntry.userId, CalendarEntry.startDate, CalendarEntry.endDate, and a composite (endDate, startDate) index.

**Email**: Nodemailer-based mail service. Uses Ethereal test accounts in development (preview URLs logged to console). Production requires SMTP configuration.

## Environment

**Web** (`apps/web/.env`): `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SENTRY_DSN` (optional). Validated at build time via `src/config/env.ts`.

**API** (`apps/api/.env`): `PORT`, `FRONTEND_URL`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_HOST`, `SECRET_KEY`, `REFRESH_SECRET_KEY`, `MAIL_SECRET_KEY`, `CSRF_SECRET` (all secrets require min 32 chars), `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` (mail settings required in production only), `MAIL_FROM` (optional), `SENTRY_DSN` (optional)

**API pool tuning** (all optional): `DB_POOL_MAX` (default: 10), `DB_POOL_IDLE_TIMEOUT_MS` (default: 10000), `DB_POOL_CONNECTION_TIMEOUT_MS` (default: 5000)

**API Test** (`apps/api/.env.test`): Same as above with `DB_NAME=b_cal_test`

## Test Users (after seeding)

- `alice@example.com` / `password123!` (email verified)
- `bob@example.com` / `password123!` (email verified)
