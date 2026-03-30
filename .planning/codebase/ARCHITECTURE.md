# Architecture

## Pattern

Turborepo monorepo with two independent applications and a shared package:

- **API** (`apps/api`): NestJS 11 modular monolith — REST API with domain modules, Prisma ORM, BullMQ job queues
- **Web** (`apps/web`): Next.js 16 App Router — server-rendered React 19 with client-side state management
- **i18n** (`packages/i18n`): Shared translation package consumed by both apps

Communication is HTTP-only (REST). No shared types between API and web — the web frontend defines its own TypeScript interfaces matching API responses.

## Layers

### API Layers

1. **HTTP Layer** — Controllers handle request/response, decorators extract auth context
   - `src/auth/auth.controller.ts`, `src/calendar/calendar.controller.ts`, `src/calendars/calendars.controller.ts`, `src/user/user.controller.ts`, `src/health/health.controller.ts`

2. **Service Layer** — Business logic, transaction management, data transformation
   - `src/auth/auth.service.ts`, `src/auth/session.service.ts`, `src/auth/session-cleanup.service.ts`
   - `src/calendar/calendar.service.ts`, `src/calendars/calendars.service.ts`
   - `src/user/user.service.ts`
   - `src/reminder/reminder.service.ts` (scheduled polling)

3. **Data Access Layer** — Prisma ORM, single `PrismaService` injected globally
   - `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts`

4. **Job Processing Layer** — BullMQ processors for async work
   - `src/mail/mail.processor.ts`, `src/reminder/reminder.processor.ts`

5. **Cross-Cutting** — Guards, filters, validators, logging, caching
   - `src/auth/guard/` (JWT, local, email-verified)
   - `src/common/filters/global-exception.filter.ts`
   - `src/calendar/validators/` (date-range, recurrence, reminder)
   - `src/common/logging/pino-serializers.ts`

### Web Layers

1. **Route Layer** — Next.js App Router pages in `app/`
   - `app/page.tsx` (calendar), `app/login/page.tsx`, `app/signup/page.tsx`, `app/settings/page.tsx`, etc.

2. **Component Layer** — UI composition
   - `components/calendar/` (views, grid, entries, sidebar)
   - `components/settings/` (tabs: profile, security, appearance, localization)
   - `components/ui/` (shadcn/ui primitives)
   - `components/app-shell.tsx` (main layout with nav)

3. **State Layer** — Zustand stores for client state
   - `lib/stores/calendarStore.ts` (entries, view, date, modal state)
   - `lib/stores/calendarsStore.ts` (named calendars, visibility)
   - `lib/stores/userStore.ts` (current user, preferences)
   - `lib/stores/connectionStore.ts` (backend health)

4. **API Client Layer** — Typed fetch wrapper with auth handling
   - `lib/api/api.ts` (base client with 401 refresh, CSRF, connection tracking)
   - `lib/api/auth.ts`, `lib/api/calendar.ts`, `lib/api/calendars.ts`

5. **Utility Layer** — Calendar math, date formatting, hooks
   - `lib/calendar/` (date-utils, overlap-utils, spanning-utils, time-utils, formatter-cache)
   - `lib/hooks/` (useCalendarData, useDynamicColumns, useEntryColor, useLocale, useMediaQuery, useVisibleEntries)

## Data Flow

### Authentication Flow
```
Login form → POST /auth/login → LocalStrategy validates credentials
→ AuthService creates Session → Sets httpOnly cookies (access_token, refresh_token)
→ Frontend stores user in useUserStore
→ Subsequent requests: JwtStrategy reads access_token cookie
→ On 401: api.ts intercepts → POST /auth/refresh → Retry original request
```

### Calendar Entry CRUD
```
Entry modal submit → lib/api/calendar.ts → POST/PATCH/DELETE /calendar/:id
→ CalendarController → CalendarService → Prisma transaction
→ Response → calendarStore updates entryMap (deduplicated)
→ React re-renders affected views
```

### Recurring Entry Expansion
```
GET /calendar?startDate&endDate → CalendarService.findAll()
→ Fetches parent entries with recurrenceExceptions
→ expand-recurrence.ts generates virtual occurrences within date range
→ Each occurrence gets synthetic ID: {parentUUID}:{ISO8601DateTime}
→ Frontend renders as individual blocks
```

### Email Reminder Flow
```
ReminderService polls every 60s via @nestjs/schedule
→ Queries entries with reminderType != null
→ Computes fire time (entry start - reminder offset)
→ Checks ReminderSent for idempotency
→ Enqueues via BullMQ → ReminderProcessor → MailQueueService → Nodemailer
```

## Entry Points

### API
- `src/instrument.ts` — Sentry init (imported first)
- `src/main.ts` — NestJS bootstrap (CORS, Helmet, CSRF, validation pipe, cookie parser)
- `src/app.module.ts` — Root module importing all feature modules

### Web
- `app/layout.tsx` — Root layout (fonts, theme, i18n, CSP nonce)
- `proxy.ts` — Next.js middleware for route protection and CSP nonce injection
- `components/AuthProvider.tsx` — Auth state initialization for protected routes

## Key Abstractions

### Synthetic IDs
Recurring entry occurrences are identified by `{parentUUID}:{ISO8601DateTime}` format. Helpers in `src/calendar/utils/occurrence-id.ts`: `composeSyntheticId()`, `isSyntheticId()`, `parseSyntheticId()`.

### Edit Scopes
Three mutation scopes for recurring entries (`src/calendar/enums/edit-scope.enum.ts`):
- `SINGLE` — Upserts a RecurrenceException
- `THIS_AND_FUTURE` — Splits the series at the occurrence date
- `ALL` — Modifies the parent entry directly

### Session Model
Authentication uses a `Session` model (not stored on User). Each login creates a session with device info. Max 5 per user with oldest eviction. Refresh tokens are session-scoped.

### Connection Guard
`components/ConnectionGuard.tsx` monitors backend health via consecutive failure counting in `connectionStore`. Shows full-screen overlay when backend is unreachable.
