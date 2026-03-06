# CLAUDE.md

This is the API package (`@b-cal/api`) within the b-cal monorepo — a calendar REST API built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT with refresh tokens).

## Commands

```bash
pnpm run build                               # Compile the project
pnpm run dev                                  # Run in watch mode
pnpm run lint                                 # ESLint with auto-fix
pnpm run format                               # Prettier formatting
pnpm run test                                 # Run unit tests (Jest 30)
npx jest --testPathPatterns="<pattern>"       # Run specific tests (pnpm test -- misparses the flag)
pnpm run test:e2e                             # Run e2e tests (uses separate test database)
pnpm run prisma:seed                          # Seed database (prompts for confirmation, --force to skip)
pnpm run prisma:migrate                       # Apply migrations
pnpm run prisma:generate                      # Regenerate Prisma client
```

## Architecture

**Modules:** AppModule imports ConfigModule, LoggerModule (nestjs-pino), ThrottlerModule, SentryModule, PrismaModule (global), AuthModule, UserModule, CalendarModule, MailModule, HealthModule.

### File Structure

```
src/
├── auth/           # Auth controller, service, session service, strategies, guards, decorators, validators
├── calendar/       # CalendarController, CalendarService, DTOs, validators
├── common/filters/ # GlobalExceptionFilter (Sentry-integrated, includes request ID in responses)
├── common/logging/ # Custom pino serializers (redact sensitive headers/query params)
├── common/utils/   # strip-html-tags utility
├── config/         # env.validation.ts (runtime env var validation via class-validator)
├── csrf/           # CSRF protection config (double-submit cookie via csrf-csrf)
├── health/         # HealthController, HealthModule (@nestjs/terminus)
├── mail/           # MailModule, MailService (nodemailer)
├── prisma/         # PrismaModule (global), PrismaService
├── user/           # UserController, UserService (account deletion, preferences)
└── main.ts         # Bootstrap with CORS, cookies, validation pipe, Helmet, CSP, CSRF
```

### Auth Endpoints

- `GET /auth/csrf-token` — generates and returns a CSRF token
- `POST /auth/signup` — creates user, sends verification email, sets token cookies
- `POST /auth/login` — validates email+password, creates session, sets access_token (1h) + refresh_token (30d) cookies
- `POST /auth/refresh` — validates refresh token via session, issues new access_token only (no refresh token rotation)
- `POST /auth/logout` — deletes session, clears cookies
- `GET /auth/me` — returns `{ id, email, emailVerified, createdAt, preferences }`
- `POST /auth/resend-verification` — resends verification email with new token
- `GET /auth/verify-email?token=` — validates email verification token
- `POST /auth/forgot-password` — sends password reset email (silent on non-existent email)
- `POST /auth/reset-password` — changes password using reset token
- `POST /auth/update-password` — changes password while logged in (requires current password, invalidates other sessions)
- `GET /auth/sessions` — list active sessions for current user
- `DELETE /auth/sessions/:id` — revoke a specific session
- `DELETE /auth/sessions` — revoke all sessions (logs out everywhere)

### User Endpoints (require JwtAuthGuard + EmailVerifiedGuard)

- `DELETE /user` — delete user account, clears auth cookies
- `GET /user/preferences` — get user preferences (language, timezone)
- `PATCH /user/preferences` — update user preferences

### Calendar Endpoints (require JwtAuthGuard + EmailVerifiedGuard)

- `POST /calendar` — create entry (title, startDate, endDate required; content, wholeDay optional)
- `GET /calendar` — list user's entries; optional `startDate`/`endDate` query params for filtering
- `GET /calendar/:id` — get single entry
- `PATCH /calendar/:id` — update entry (partial updates)
- `DELETE /calendar/:id` — delete entry

### Session Management

Auth uses a `Session` model instead of storing a single refresh token on the User. Each login creates a session tracking device name (parsed from user agent via `ua-parser-js`), IP address, and expiry. Max 5 sessions per user (`SESSION_MAX_SESSIONS`); oldest sessions are evicted on new login. Session max age is 30 days (`SESSION_MAX_AGE_MS`).

### Auth Internals

**Strategies:** LocalStrategy (bcrypt, 10 rounds), JwtStrategy (reads access_token cookie), JwtRefreshStrategy (reads refresh_token cookie, extracts sessionId from JWT `sid` claim).

**Guards:** LocalAuthGuard, JwtAuthGuard, JwtRefreshAuthGuard, EmailVerifiedGuard.

**Custom decorators:** `@User()` — extracts JwtUser (`{ id, email, emailVerified, sessionId }`) from request.

**Custom validators:** `@IsValidPassword()` (8+ chars, number, symbol), `@IsStartBeforeEnd()` (startDate ≤ endDate).

**DTO max lengths:** email: 254, password: 128, title: 100, content: 5000. Calendar title/content sanitized via `stripHtmlTags`.

### Prisma Schema

`User` (id, email, password, emailVerified, verificationToken, resetToken; relations to CalendarEntry, UserPreferences, Session), `Session` (id, userId, refreshToken, deviceName, ipAddress, userAgent, lastUsedAt, expiresAt, createdAt), `CalendarEntry` (id, title, startDate, endDate, content, wholeDay, userId), `UserPreferences` (userId, language, timezone).

### i18n

Uses `nestjs-i18n` for backend internationalization.

### Rate Limiting

Global throttling via `@nestjs/throttler` (APP_GUARD) with two throttlers: default (60/60s) and mail (300/5min). Auth endpoints have stricter default limits: 5/60s. Mail-sending endpoints additionally apply mail throttler at 3/5min.

### Security

- **CSRF:** Double-submit cookie via `csrf-csrf`. Cookie name varies by environment. Client sends token in `x-csrf-token` header.
- **Helmet:** HSTS (1-year), strict CSP (frame-ancestors/object-src none).
- **Request IDs:** `X-Request-Id` header auto-generated if not provided, included in logs and error responses.
- **Sentry:** `@sentry/nestjs` with PII scrubbing (`sentry-before-send.ts`). GlobalExceptionFilter extends SentryGlobalFilter.
- **Logging:** `nestjs-pino` with sensitive field redaction and custom request/response serializers.
- **Payload limit:** 1MB for JSON and URL-encoded bodies.

### Environment

`PORT`, `FRONTEND_URL`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_HOST`, `SECRET_KEY`, `REFRESH_SECRET_KEY`, `MAIL_SECRET_KEY`, `CSRF_SECRET` (min 32 chars each), `MAIL_HOST`/`MAIL_PORT`/`MAIL_USER`/`MAIL_PASS` (production only), `MAIL_FROM` (optional), `SENTRY_DSN` (optional), pool tuning vars (optional).

### Code Style

- ESLint 9 flat config + Prettier, single quotes, trailing commas
- TypeScript target: ES2023, `noImplicitAny` disabled
