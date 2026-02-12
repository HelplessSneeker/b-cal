# CLAUDE.md

## Project Overview

This is the API package (`@b-cal/api`) within the b-cal monorepo. It's a calendar REST API built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT with refresh tokens).

**Monorepo structure:**
```
b-cal/                  # Root (Turborepo + pnpm workspaces)
├── apps/
│   ├── api/            # This package (@b-cal/api)
│   └── web/            # Frontend (@b-cal/web)
└── turbo.json
```

## Commands

Run from this directory (`apps/api`):

- `pnpm run build` — compile the project
- `pnpm run dev` — run in watch mode
- `pnpm run lint` — ESLint with auto-fix
- `pnpm run format` — Prettier formatting
- `pnpm run test` — run unit tests (Jest 30)
- `npx jest --testPathPatterns="<pattern>"` — run specific tests (`pnpm test --` misparses the flag; use `npx jest` directly instead. Jest 30 uses `--testPathPatterns`, not `--testPathPattern`)
- `pnpm run test:cov` — run tests with coverage
- `pnpm run test:e2e` — run e2e tests (uses separate test database)
- `pnpm run prisma:seed` — seed database with test data (prompts for confirmation, use `--force` to skip)
- `pnpm run prisma:migrate` — apply migrations
- `pnpm run prisma:generate` — regenerate Prisma client
- `docker compose up -d` — start PostgreSQL

Or from monorepo root:

- `pnpm run dev:api` — run API in watch mode via Turborepo

## Docker

Multi-stage Dockerfile (`Dockerfile`) using Node 22 Alpine. Builds with `pnpm deploy --legacy --prod` for a minimal production image. Includes a healthcheck on `/health`. Exposes port 3000.

## Infrastructure

PostgreSQL 16 runs via `docker-compose.yml`. Environment variables in `.env` (dev) and `.env.test` (e2e tests):
- `PORT` (default 3000), `FRONTEND_URL` (CORS origin)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_HOST`
- `SECRET_KEY` (access token), `REFRESH_SECRET_KEY` (refresh token), `MAIL_SECRET_KEY` (email tokens)
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` (production email; dev uses Ethereal)
- `SENTRY_DSN` (optional — Sentry error tracking DSN)

## Database Seeding

Run `pnpm run prisma:seed` to populate the database with test data. The seed script creates:

**Test users** (password for all: `password123!`):
- `alice@example.com`
- `bob@example.com`

**Sample calendar entries:** 11 entries distributed between the test users (includes whole-day events, multi-day events, and various time-based scenarios).

## Test Database

E2e tests use a separate database (`b_cal_test`) configured in `.env.test`. Running `pnpm run test:e2e` automatically:
1. Drops and recreates the test database
2. Runs all migrations
3. Seeds with test data
4. Executes tests

## Architecture

**Modules:** AppModule imports ConfigModule, LoggerModule (nestjs-pino), ThrottlerModule, SentryModule, PrismaModule (global), AuthModule, UserModule, CalendarModule, MailModule, HealthModule.

**File structure:**
```
src/
├── auth/           # Auth controller, service, strategies, guards, decorators, validators
├── calendar/       # CalendarController, CalendarService, DTOs, validators
├── common/filters/ # GlobalExceptionFilter (Sentry-integrated)
├── config/         # env.validation.ts (runtime env var validation via class-validator)
├── health/         # HealthController, HealthModule (@nestjs/terminus)
├── mail/           # MailModule, MailService (nodemailer)
├── prisma/         # PrismaModule (global), PrismaService
├── user/           # UserController, UserService for user operations (account deletion)
├── instrument.ts   # Sentry SDK initialization (imported before NestFactory.create)
└── main.ts         # Bootstrap with CORS, cookies, validation pipe, Helmet, CSP
```

**Global payload limit:** 1MB for JSON and URL-encoded bodies (configured in `main.ts`).

**Auth flow:** Tokens stored in httpOnly cookies (not Bearer headers). Refresh tokens and reset tokens are bcrypt-hashed in DB.
- `POST /auth/signup` — creates user, sends verification email, sets token cookies. Password: min 8 chars, requires number + symbol.
- `POST /auth/login` — LocalAuthGuard validates email+password, sets access_token (1h) + refresh_token (7d) cookies
- `POST /auth/refresh` — JwtRefreshAuthGuard validates refresh token, issues new token pair
- `POST /auth/logout` — JwtAuthGuard required, clears cookies and invalidates refresh token
- `GET /auth/me` — JwtAuthGuard required, returns `{ id, email }`
- `POST /auth/resend-verification` — JwtAuthGuard required, resends verification email with new token
- `GET /auth/verify-email?token=` — validates email verification token, sets `emailVerified: true`
- `POST /auth/forgot-password` — sends password reset email (silent on non-existent email for security)
- `POST /auth/reset-password` — changes password using reset token (token + new password in body)

**Email verification:** On signup, a JWT verification token (1d expiry) is generated and emailed to the user. The frontend link points to `/verify-email?token=...`.

**Password reset:** User requests reset via email, receives a JWT reset token (1h expiry). The token is bcrypt-hashed before storage in `resetToken`. On password change, the plain token is compared against the hash and cleared on success.

**Health endpoint:**
- `GET /health` — returns database, memory, and disk health status (no auth required, throttle-exempt)

**User endpoints:** All require JwtAuthGuard + EmailVerifiedGuard.
- `DELETE /user` — delete user account, clears auth cookies

**Calendar endpoints:** All require JwtAuthGuard.
- `POST /calendar` — create entry (title, startDate, endDate required; content, wholeDay optional)
- `GET /calendar` — list user's entries; optional `startDate`/`endDate` query params for date range filtering
- `GET /calendar/:id` — get single entry (404 if not found or not owned)
- `PATCH /calendar/:id` — update entry (partial updates supported)
- `DELETE /calendar/:id` — delete entry

**Strategies:** LocalStrategy (bcrypt, 10 rounds), JwtStrategy (reads access_token cookie), JwtRefreshStrategy (reads refresh_token cookie).

**Guards:** LocalAuthGuard, JwtAuthGuard, JwtRefreshAuthGuard, EmailVerifiedGuard — use on protected routes. EmailVerifiedGuard can be combined with JwtAuthGuard to restrict access to verified users only (throws ForbiddenException if email not verified).

**Custom decorators:** `@User()` — extracts JwtUser (`{ id, email }`) from request in JWT-protected routes.

**Custom validators:**
- `@IsValidPassword()` — enforces password complexity (8+ chars, number, symbol)
- `@IsStartBeforeEnd()` — validates startDate ≤ endDate on calendar DTOs

**DTO max lengths:** `MaxLength` constraints on all string fields — email: 254, password: 128, title: 255, content: 5000.

**Prisma schema:** `User` (id, email, password, refreshToken, verificationToken, emailVerified, resetToken) and `CalendarEntry` (id, title, startDate, endDate, content, wholeDay, userId→User). Indexes: User has `@@index([email])`. CalendarEntry has `@@index([userId])`, `@@index([startDate])`, `@@index([endDate])`, and `@@index([endDate, startDate])`.

**Mail service:** Uses nodemailer. In development, auto-creates Ethereal test accounts (preview URLs logged to console). In production, requires `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` env vars.

**Rate limiting:** Global throttling via `@nestjs/throttler` (60 requests per 60 seconds, applied as APP_GUARD). Auth endpoints (login, signup, forgot-password, reset-password, resend-verification) have stricter limits: 5 requests per 60 seconds.

**Error monitoring:** Sentry integration via `@sentry/nestjs`. Initialized in `instrument.ts` (must be imported before anything else in `main.ts`). Uses `pinoIntegration()` for log forwarding. A custom `GlobalExceptionFilter` extends `SentryGlobalFilter` — HTTP exceptions are returned directly without Sentry reporting; unexpected exceptions are captured and return 500.

**Health checks:** `GET /health` endpoint (throttle-exempt) via `@nestjs/terminus`. Checks database (Prisma ping), heap memory (150MB threshold), and disk usage (90% threshold).

**Security headers:** Helmet middleware with HSTS (1-year max-age, includeSubDomains, preload) and strict CSP (self-only defaults; unsafe-inline scripts/styles and data: images allowed in development only; frame-ancestors and object-src set to none).

**Environment validation:** Runtime validation of all required env vars on startup (`src/config/env.validation.ts`). Uses class-validator decorators. Mail settings (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`) are only required in production.

**Logging:** Structured logging via `nestjs-pino`. In development, uses `pino-pretty` with colorized output (req/res hidden). In production, outputs JSON logs at `info` level.

**API docs:** Swagger at `/api` (development only — disabled in production).

## Code Style

- ESLint 9 flat config + Prettier
- Single quotes, trailing commas
- `noImplicitAny` disabled
- TypeScript target: ES2023
