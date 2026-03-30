# Structure

## Root Layout

```
b-cal/
├── apps/
│   ├── api/                    # NestJS 11 REST API
│   └── web/                    # Next.js 16 frontend
├── packages/
│   └── i18n/                   # Shared i18n translations (EN/DE)
├── .github/workflows/          # CI/CD (build, lint, test, security, docker, release)
├── docker-compose.yml          # Local dev services (postgres, redis, api, web)
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definitions
└── package.json                # Root scripts, engines (Node 24+)
```

## API Structure (`apps/api/`)

```
apps/api/
├── src/
│   ├── main.ts                 # Bootstrap (CORS, Helmet, CSRF, pipes)
│   ├── app.module.ts           # Root module (all imports)
│   ├── instrument.ts           # Sentry init
│   ├── sentry-before-send.ts   # PII scrubbing
│   ├── auth/                   # Authentication module
│   │   ├── auth.controller.ts  # 12+ auth endpoints
│   │   ├── auth.service.ts     # Auth business logic (signup, login, tokens)
│   │   ├── session.service.ts  # Session CRUD, eviction
│   │   ├── session-cleanup.service.ts  # Expired session cleanup
│   │   ├── constants.ts        # Session limits, cookie config
│   │   ├── types.ts            # JwtUser, JwtPayload types
│   │   ├── decorators/         # @User() decorator
│   │   ├── dto/                # Login, Signup, ChangePassword, etc.
│   │   ├── guard/              # JWT, Local, EmailVerified guards
│   │   ├── strategy/           # Passport strategies (local, jwt, jwt-refresh)
│   │   └── validators/         # Password strength validator
│   ├── calendar/               # Calendar entries module
│   │   ├── calendar.controller.ts  # CRUD + recurring entry support
│   │   ├── calendar.service.ts     # Entry logic, edit scopes, transactions
│   │   ├── dto/                # Create, Update, Delete, GetEntries DTOs
│   │   ├── enums/              # EditScope, RecurrenceFrequency, ReminderType/Unit
│   │   ├── utils/              # expand-recurrence.ts, occurrence-id.ts
│   │   └── validators/         # Date range, recurrence, reminder validators
│   ├── calendars/              # Named calendars module
│   │   ├── calendars.controller.ts  # Calendar CRUD (max 5 per user)
│   │   ├── calendars.service.ts
│   │   ├── dto/                # Create, Update, Delete DTOs
│   │   └── enums/              # CalendarColor enum
│   ├── user/                   # User module
│   │   ├── user.controller.ts  # Delete account, preferences
│   │   ├── user.service.ts     # Account management
│   │   ├── dto/                # Create/Update preferences DTOs
│   │   └── validators/         # Timezone validator
│   ├── mail/                   # Email module (BullMQ)
│   │   ├── mail.service.ts     # Nodemailer wrapper
│   │   ├── mail-queue.service.ts   # Queue management
│   │   ├── mail.processor.ts   # BullMQ worker
│   │   └── mail-job.types.ts   # Job type definitions
│   ├── reminder/               # Email reminder module
│   │   ├── reminder.service.ts # Scheduled polling (60s)
│   │   ├── reminder.processor.ts   # BullMQ worker
│   │   └── reminder-job.types.ts
│   ├── prisma/                 # Database access
│   │   ├── prisma.service.ts   # Prisma client wrapper
│   │   └── prisma.module.ts    # Global module
│   ├── common/                 # Shared utilities
│   │   ├── cache-shutdown.service.ts
│   │   ├── filters/            # GlobalExceptionFilter
│   │   ├── logging/            # Pino serializers (PII redaction)
│   │   └── utils/              # strip-html-tags, i18n helper
│   ├── config/                 # env.validation.ts
│   ├── csrf/                   # csrf.config.ts (double-submit cookie)
│   └── health/                 # Health check endpoint
├── prisma/
│   ├── schema/                 # Prisma schema files
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Test data seeder
├── test/                       # E2E tests
│   ├── auth.e2e-spec.ts
│   ├── calendar.e2e-spec.ts
│   ├── user.e2e-spec.ts
│   ├── global-setup.ts
│   └── setup-env.ts
└── Dockerfile                  # Multi-stage build
```

## Web Structure (`apps/web/`)

```
apps/web/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (fonts, theme, i18n, nonce)
│   ├── page.tsx                # Main calendar page
│   ├── globals.css             # Tailwind CSS v4, theme tokens
│   ├── error.tsx               # Error boundary
│   ├── global-error.tsx        # Top-level error boundary
│   ├── not-found.tsx           # 404 page
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── check-email/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── settings/page.tsx
│   └── health/route.ts        # Health check API route
├── components/
│   ├── app-shell.tsx           # Main layout (desktop icon rail + mobile tabs)
│   ├── app-shell-skeleton.tsx  # Loading skeleton
│   ├── AuthProvider.tsx        # Auth state + CSRF init
│   ├── ConnectionGuard.tsx     # Backend health overlay
│   ├── ThemeProvider.tsx       # next-themes with CSP nonce
│   ├── entry-modal.tsx         # Entry create/edit form
│   ├── auth-layout.tsx         # Auth pages wrapper
│   ├── calendar/               # Calendar components
│   │   ├── views/              # day-view, week-view, month-view
│   │   ├── calendar-header.tsx
│   │   ├── calendar-sidebar.tsx
│   │   ├── calendar-list.tsx
│   │   ├── calendar-manage-dialog.tsx
│   │   ├── time-grid.tsx
│   │   ├── time-column.tsx
│   │   ├── day-column.tsx
│   │   ├── entry-block.tsx
│   │   ├── entry-preview.tsx
│   │   ├── all-day-section.tsx
│   │   ├── week-all-day-row.tsx
│   │   ├── current-time-indicator.tsx
│   │   ├── date-cell.tsx
│   │   ├── month-week-row.tsx
│   │   ├── more-indicator.tsx
│   │   ├── overflow-pill.tsx
│   │   ├── sidebar-calendar.tsx
│   │   └── swipe-container.tsx
│   ├── settings/               # Settings tabs
│   │   ├── profile-tab.tsx
│   │   ├── security-tab.tsx
│   │   ├── appearance-tab.tsx
│   │   ├── localization-tab.tsx
│   │   └── settings-sidebar.tsx
│   └── ui/                     # shadcn/ui components (~25 primitives)
├── lib/
│   ├── api/                    # API client layer
│   │   ├── api.ts              # Base client (refresh, CSRF, errors)
│   │   ├── auth.ts             # Auth API functions
│   │   ├── calendar.ts         # Calendar entry API
│   │   └── calendars.ts        # Named calendars API
│   ├── stores/                 # Zustand state management
│   │   ├── calendarStore.ts    # View, entries, modal
│   │   ├── calendarsStore.ts   # Named calendars
│   │   ├── userStore.ts        # Current user
│   │   └── connectionStore.ts  # Backend health
│   ├── calendar/               # Calendar utilities
│   │   ├── date-utils.ts
│   │   ├── time-utils.ts
│   │   ├── overlap-utils.ts
│   │   ├── spanning-utils.ts
│   │   ├── formatter-cache.ts
│   │   └── calendar-constants.ts
│   ├── hooks/                  # Custom hooks
│   │   ├── useCalendarData.ts
│   │   ├── useDynamicColumns.ts
│   │   ├── useEntryColor.ts
│   │   ├── useLocale.ts
│   │   ├── useMediaQuery.ts
│   │   └── useVisibleEntries.ts
│   └── utils/                  # General utilities
│       ├── utils.ts            # cn() helper
│       ├── accent-color.ts
│       ├── calendar-colors.ts
│       ├── password.ts
│       └── theme-cookie.ts
├── src/
│   ├── config/env.ts           # Env validation
│   └── i18n/                   # next-intl config
├── __tests__/                  # Integration tests (Vitest)
│   ├── test-utils.ts
│   └── lib/
│       ├── api/api.test.ts
│       ├── calendar/           # date-utils, overlap, spanning tests
│       └── stores/             # calendarStore, connectionStore tests
├── proxy.ts                    # Route protection middleware + CSP nonce
├── vitest.config.mts
└── Dockerfile                  # Multi-stage build
```

## i18n Package (`packages/i18n/`)

```
packages/i18n/
├── locales/
│   ├── en/                     # English translations
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── calendar.json
│   │   ├── settings.json
│   │   ├── error.json
│   │   └── success.json
│   └── de/                     # German translations (same structure)
└── config.ts                   # Locale config, defaultLocale export
```

## Naming Conventions

- **API modules**: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- **API tests**: `{feature}.{type}.spec.ts` (unit in `src/`, e2e in `test/`)
- **API DTOs**: `{action}-{feature}.dto.ts` (e.g., `create-calendar.dto.ts`)
- **API enums**: `{name}.enum.ts`
- **API validators**: `{name}.validator.ts`
- **Web pages**: `app/{route}/page.tsx`
- **Web components**: kebab-case filenames (e.g., `calendar-header.tsx`, `entry-block.tsx`)
- **Web stores**: camelCase with `Store` suffix (e.g., `calendarStore.ts`)
- **Web hooks**: `use{Name}.ts` (e.g., `useCalendarData.ts`)
- **Web tests**: `__tests__/` mirroring `lib/` structure, `.test.ts` suffix
