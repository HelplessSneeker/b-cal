# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.7.3 - Used in both web and API
- JavaScript (Node.js) - Runtime and tooling

**Secondary:**
- SQL - PostgreSQL queries via Prisma ORM

## Runtime

**Environment:**
- Node.js 24+ (required via `engines` in `package.json`)

**Package Manager:**
- pnpm 10.33.0
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- Next.js 16.1.6 (`@b-cal/web`) - Frontend framework with App Router and React 19 integration
- NestJS 11.0.1+ (`@b-cal/api`) - Backend REST API framework
- React 19.2.3 (`@b-cal/web`) - UI library
- Turborepo 2.8.3 - Monorepo management at root

**Testing:**
- Vitest 4.0.18 (`@b-cal/web`) - Integration tests with jsdom, React Testing Library
- Jest 30.0.0 (`@b-cal/api`) - Unit and e2e tests

**Build/Dev:**
- Tailwind CSS 4 (`@b-cal/web`) - CSS framework
- TypeScript compiler (tsc/tsconfig)
- ESLint 9 - Linting across all packages
- Prettier 3.8.1 - Code formatting
- tsx 4.21.0 (`@b-cal/api`) - TypeScript execution for seed scripts

## Key Dependencies

**Critical:**

### Frontend (`@b-cal/web`)
- `next 16.1.6` - Framework core
- `react 19.2.3`, `react-dom 19.2.3` - UI runtime
- `@radix-ui` (label, separator, slot) + `radix-ui 1.4.3` - Accessible UI primitives
- `@sentry/nextjs 10.38.0` - Error tracking with PII scrubbing
- `next-intl 4.8.3` - i18n integration with `@b-cal/i18n`
- `next-themes 0.4.6` - Dark mode theming
- `zustand 5.0.10` - State management (userStore, calendarStore, calendarsStore, connectionStore)
- `date-fns 4.1.0` - Date utilities for calendar logic
- `react-day-picker 9.13.0` - Calendar picker component
- `sonner 2.0.7` - Toast notifications
- `lucide-react 0.563.0` - Icon library
- `class-variance-authority 0.7.1` - Component style variants
- `tailwind-merge 3.4.0` - Merge Tailwind classes safely

### Backend (`@b-cal/api`)
- `@nestjs/core 11.0.1+` - Framework core
- `@nestjs/common 11.0.1+` - Common utilities
- `@nestjs/platform-express 11.0.1+` - Express adapter
- `@prisma/client 7.3.0` - Database ORM
- `@prisma/adapter-pg 7.3.0` - PostgreSQL driver
- `pg 8.17.2` - Native PostgreSQL client
- `@nestjs/jwt 11.0.2` - JWT token generation and validation
- `@nestjs/passport 11.0.5` - Passport.js integration
- `passport 0.7.0`, `passport-jwt 4.0.1`, `passport-local 1.0.0` - Authentication strategies
- `@nestjs/schedule 6.1.1` - Scheduled job scheduler (reminder polling at 60s intervals)
- `@nestjs/bullmq 11.0.4` - BullMQ queue integration
- `bullmq 5.71.0` - Job queue with Redis backend (mail and reminder jobs)
- `@nestjs/cache-manager 3.1.0` - Caching layer
- `@keyv/redis 5.1.6` - Redis cache backend (15min default TTL)
- `keyv 5.6.0`, `cache-manager 7.2.8` - Cache abstraction
- `bcrypt 6.0.0` - Password hashing (10 rounds)
- `nodemailer 8.0.0` - Email sending
- `csrf-csrf 4.0.3` - CSRF protection (double-submit cookie pattern)
- `helmet 8.1.0` - HTTP security headers (HSTS 1-year, strict CSP)
- `@sentry/nestjs 10.38.0` - Error tracking
- `@sentry/profiling-node 10.38.0` - Performance profiling
- `nestjs-pino 4.5.0` - Structured logging with pino
- `nestjs-i18n 10.6.0` - i18n with `AcceptLanguageResolver`
- `@nestjs/throttler 6.5.0` - Rate limiting (default 60/60s, auth 5/60s, mail 3/5min)
- `@nestjs/swagger 11.2.5` - API documentation (dev only)
- `@nestjs/terminus 11.0.0` - Health checks with Redis indicator
- `cookie-parser 1.4.7` - Cookie middleware
- `dotenv 17.2.3` - Environment loading
- `ua-parser-js 2.0.9` - User-agent parsing for device name in sessions
- `class-validator 0.14.3` - DTO validation
- `class-transformer 0.5.1` - DTO transformation
- `@nestjs/mapped-types 2.1.0` - DTO mapping utilities
- `rxjs 7.8.1` - Reactive programming

**Shared:**
- `@b-cal/i18n` - Shared i18n package with EN/DE locales and namespaces (common, auth, calendar, settings, error, success)

## Configuration

**Environment:**
- Runtime env validation: `apps/api/src/config/env.validation.ts` (class-validator)
- Web env validation: `apps/web/src/config/env.ts`
- `dotenv` loads `.env` files in API

**Required env vars (API):**
```
PORT, FRONTEND_URL
DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_HOST
SECRET_KEY, REFRESH_SECRET_KEY, MAIL_SECRET_KEY, CSRF_SECRET (min 32 chars)
REDIS_HOST, REDIS_PORT
MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS (production only)
MAIL_FROM (optional), SENTRY_DSN (optional)
DB_POOL_MAX, DB_POOL_IDLE_TIMEOUT_MS, DB_POOL_CONNECTION_TIMEOUT_MS (optional, pool tuning)
```

**Required env vars (Web):**
```
NEXT_PUBLIC_BACKEND_URL
NEXT_PUBLIC_SENTRY_DSN (optional)
```

**Build:**
- `apps/api/tsconfig.json` - TypeScript config for API
- `apps/web/tsconfig.json` - TypeScript config for web
- `apps/web/vitest.config.mts` - Vitest config with `jsdom` environment
- `apps/web/next.config.ts` - Next.js config with Sentry integration, next-intl plugin, standalone output
- `apps/api/jest.config.json` - Jest config in `package.json` (embedded)
- `.prettierrc` (root) - Prettier formatting rules
- ESLint flat configs in each app: `apps/web/eslint.config.mjs`, `apps/api` (via `@nestjs/cli`)
- `postcss.config.mjs` (`apps/web`) - PostCSS/Tailwind pipeline

## Platform Requirements

**Development:**
- Node.js 24+
- Docker (for PostgreSQL 16-alpine, Redis 7-alpine via `docker-compose.yml`)
- pnpm 10.33.0

**Production:**
- Docker images: Node 24 Alpine base for both API and web
- PostgreSQL 16+
- Redis 7+
- Port 3000 (API), Port 8080 (Web)

**API Docker image:**
- Multi-stage: compiles with Node 24, runs `prisma migrate deploy` on startup, executes `node dist/src/main`
- Healthcheck: GET `/health` (exposed by `@nestjs/terminus`)

**Web Docker image:**
- Multi-stage: builds with Node 24, uses Next.js standalone output
- Requires build arg `NEXT_PUBLIC_BACKEND_URL` set at build time
- Healthcheck: GET `/health`

---

*Stack analysis: 2026-03-30*
