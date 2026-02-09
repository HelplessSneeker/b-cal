# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

b-cal is a calendar application built as a Turborepo monorepo with pnpm workspaces. It consists of:

- **apps/web** (`@b-cal/frontend`) - Next.js 16 frontend with React 19
- **apps/api** (`@b-cal/api`) - NestJS 11 REST API with Prisma/PostgreSQL

See `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md` for detailed architecture documentation.

## Commands

From the monorepo root:

```bash
pnpm dev          # Start both web and API in watch mode
pnpm dev:web      # Start only the web frontend (port 8080)
pnpm dev:api      # Start only the API (port 3000)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
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
pnpm test -- --testPathPatterns=<pattern>    # Run specific tests (Jest 30 syntax)
pnpm test:e2e                                # Run e2e tests (uses separate test database)
pnpm prisma:migrate                          # Apply database migrations
pnpm prisma:generate                         # Regenerate Prisma client
pnpm prisma:seed                             # Seed database with test data
docker compose up -d                         # Start PostgreSQL
```

## Architecture

**Authentication**: Cookie-based JWT auth (httpOnly cookies, not Bearer headers). Access tokens expire in 1h, refresh tokens in 7d. Email verification is required after signup — unverified users are redirected to `/check-email`. Password reset is supported via email with 1h token expiry.

**Frontend State**: Zustand stores for user state and calendar state (view mode, entries, modals).

**API Structure**: NestJS modules (AuthModule, UserModule, CalendarModule, PrismaModule, MailModule). Swagger docs at `/api`.

**Rate Limiting**: Global throttling via `@nestjs/throttler` (10 requests per 60 seconds).

**Logging**: Structured logging via `nestjs-pino`. Pretty-printed in development, JSON in production.

**Database**: PostgreSQL via Prisma. Models: User (with emailVerified, verificationToken, resetToken fields), CalendarEntry.

**Email**: Nodemailer-based mail service. Uses Ethereal test accounts in development (preview URLs logged to console). Production requires SMTP configuration.

## Environment

**Web** (`apps/web/.env`): `NEXT_PUBLIC_BACKEND_URL`

**API** (`apps/api/.env`): `PORT`, `FRONTEND_URL`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `SECRET_KEY`, `REFRESH_SECRET_KEY`, `MAIL_SECRET_KEY`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`

**API Test** (`apps/api/.env.test`): Same as above with `DB_NAME=b_cal_test`

## Test Users (after seeding)

- `alice@example.com` / `password123!` (email verified)
- `bob@example.com` / `password123!` (email verified)
