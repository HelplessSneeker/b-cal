# CLAUDE.md

This is the **web frontend** (`apps/web`) within the b-cal Turborepo monorepo.

## Commands

```bash
pnpm dev      # Start development server (http://localhost:8080)
pnpm build    # Production build
pnpm lint     # Run ESLint
pnpm test     # Run integration tests (Vitest)
```

## Architecture

Next.js 16 application using the App Router with React 19 and TypeScript.

### Key Directories

- `app/` — Next.js App Router pages and layouts (login, signup, check-email, verify-email, forgot-password, reset-password, settings, health, error/not-found pages)
- `components/` — React components
  - `components/ui/` — shadcn/ui primitives
  - `components/calendar/` — Calendar-specific components (header, sidebar, time grid, day/week/month views, entry blocks)
  - `components/settings/` — Settings page tabs (profile, security, appearance, localization)
  - `components/app-shell.tsx` — Unified layout with desktop icon rail and mobile bottom tab bar (calendar, settings, user menu with logout)
  - `components/AuthProvider.tsx` — Wraps protected routes; fetches CSRF token, redirects unauthenticated users to `/login` and unverified users to `/check-email`
  - `components/ConnectionGuard.tsx` — Full-screen overlay when backend is unreachable; polls `/health` every 10s
  - `components/entry-modal.tsx` — Entry creation/editing form with recurrence controls and scope dialog for recurring entries
- `lib/api/` — Typed API layer with silent token refresh, CSRF handling, and `X-Request-Id` generation
- `lib/stores/` — Zustand stores (userStore, calendarStore, connectionStore)
- `lib/calendar/` — Calendar utilities (date, time, overlap, spanning calculations)
- `lib/hooks/` — Custom React hooks (useCalendarData, useLocale, useMediaQuery)
- `proxy.ts` — Next.js 16 proxy (route protection, CSP nonce generation)
- `src/config/env.ts` — Environment variable validation

### Authentication

- Cookie-based auth with the NestJS backend (configured via `NEXT_PUBLIC_BACKEND_URL`)
- `AuthProvider` wraps protected routes, fetches CSRF token on mount
- `proxy.ts` handles route-level auth:
  - **Auth routes** (`/login`, `/signup`, `/forgot-password`, `/reset-password`): redirect authenticated users to `/`
  - **Open routes** (`/verify-email`, `/check-email`, `/health`): accessible regardless of auth state
  - **All other routes**: redirect unauthenticated users to `/login?from={pathname}`
- Silent token refresh on 401 with promise deduplication
- CSRF token auto-fetched via `GET /auth/csrf-token`, auto-retried on 403

### State Management

- `useUserStore` — Current user (id, email, emailVerified, createdAt, preferences)
- `useCalendarStore` — Calendar view state (Day/Week/Month, default: Month), current date, entries (deduplicated via `entryMap`), loaded date ranges, cache versioning for invalidation, entry modal state. View and current date persisted to `localStorage` (keys `b-cal:view`, `b-cal:currentDate`). Entries include recurring fields: `isRecurring`, `recurrenceFrequency`, `recurrenceByDay`, `recurrenceUntil`, `originalDate`.
- `useConnectionStore` — Backend health tracking (consecutive failures threshold of 2, isBackendDown)

### Calendar

Day (24h grid with 30min slots, all-day section, current time indicator), Week (7-day grid with all-day row), Month (date cells with entry previews and "+N more" overflow). Swipe gesture support for mobile navigation.

**Recurring entries**: Entries can recur DAILY, WEEKLY (with day selection), or MONTHLY. Recurring entries display a repeat icon. Editing or deleting a recurring entry opens a scope dialog (SINGLE, THIS_AND_FUTURE, ALL). The API returns virtual occurrences with synthetic IDs; the calendar store handles cache invalidation when recurring entries are modified.

### i18n

Uses `next-intl` with translations from the shared `@b-cal/i18n` package. Supports EN and DE locales. Namespaces: common, auth, calendar, settings, error, success.

### Settings Page

`/settings` with tabs:
- **Profile** — Account info, delete account
- **Security** — Change password, session management (list/revoke sessions)
- **Appearance** — Theme (light/dark/system), accent color, week start day, density (persisted via `PATCH /user/preferences`)
- **Localization** — Language and timezone preferences (persisted via `PATCH /user/preferences`)

### Styling

- Tailwind CSS v4 with CSS variables for theming (defined in `app/globals.css`)
- shadcn/ui configured with "new-york" style and lucide icons
- Dark mode via `.dark` class with `next-themes` ThemeProvider
- Accent color customization via CSS variables (`lib/utils/accent-color.ts`)
- Use `cn()` from `@/lib/utils/utils` for conditional class merging

### Testing

- Vitest with jsdom, React Testing Library, `@testing-library/user-event`
- Tests in `__tests__/` directory, shared utilities in `__tests__/test-utils.ts`

### Error Monitoring

Sentry integration via `@sentry/nextjs`. Uses a `/monitoring` tunnel route to circumvent ad-blockers.

### Path Aliases

- `@/*` maps to the project root (e.g., `@/components/ui/button`)
