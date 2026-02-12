# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is the **web frontend** (`apps/web`) within a Turborepo monorepo:

```
b-cal/
  apps/
    web/     # This package - Next.js frontend
    api/     # NestJS backend
  turbo.json # Turborepo configuration
```

## Commands

Run from this directory (`apps/web`):

```bash
pnpm dev      # Start development server (http://localhost:8080)
pnpm build    # Production build
pnpm lint     # Run ESLint
pnpm test     # Run integration tests (Vitest)
```

Or from the monorepo root:

```bash
pnpm dev --filter=web      # Start web dev server
pnpm build --filter=web    # Build web only
```

## Docker

Multi-stage Dockerfile using Node 22 Alpine with Next.js standalone output. Requires `NEXT_PUBLIC_BACKEND_URL` as a build arg. Exposes port 8080.

## Architecture

This is a Next.js 16 application using the App Router with React 19 and TypeScript.

### Key Directories

- `app/` - Next.js App Router pages and layouts
  - `app/login/` - Login page
  - `app/signup/` - Signup page
  - `app/check-email/` - Post-signup page prompting user to verify email (resend with 60s cooldown)
  - `app/verify-email/` - Email verification callback (`?token=...`), validates token and redirects to `/`
  - `app/forgot-password/` - Password reset request form (enter email)
  - `app/reset-password/` - Password reset form (`?token=...`), enter new password
  - `app/error.tsx` - Error boundary with retry button
  - `app/global-error.tsx` - Root error boundary (catches layout-level errors)
  - `app/not-found.tsx` - Custom 404 page
  - `app/page.tsx` - Main calendar page (protected by AuthProvider)
- `components/` - React components
  - `components/ui/` - shadcn/ui primitives (avatar, button, calendar, card, checkbox, dialog, dropdown-menu, field, input, label, loading, scroll-area, separator, sonner, spinner, textarea)
  - `components/AuthProvider.tsx` - Wraps protected routes; redirects unauthenticated users to `/login` and unverified users to `/check-email`
  - `components/login-form.tsx` - Shared form for login/signup pages with "Forgot your password?" link
  - `components/verify-email-content.tsx` - Client component handling email verification API call and redirect
  - `components/reset-password-form.tsx` - Client component with password/confirm fields and client-side validation
  - `components/entry-modal.tsx` - Modal dialog for creating/editing/deleting calendar entries
  - `components/calendar/` - Calendar-specific components
    - `calendar-header.tsx` - Top navigation with view selector, date navigation, and user menu
    - `calendar-sidebar.tsx` - Left sidebar with "New Entry" button and mini calendar
    - `sidebar-calendar.tsx` - Mini calendar using react-day-picker with view-aware selection
    - `time-grid.tsx` - Scrollable time grid wrapper, auto-scrolls to 8am on mount
    - `day-column.tsx` - Single day column with time slots and entry blocks
    - `time-column.tsx` - Hour labels column (00:00-23:00)
    - `time-slot.tsx` - 30-minute clickable time slot
    - `entry-block.tsx` - Positioned calendar entry block with title and time range
    - `entry-preview.tsx` - Entry preview component for month view
    - `current-time-indicator.tsx` - Red line showing current time (updates every minute)
    - `all-day-section.tsx` - All-day entries section for day view
    - `week-all-day-row.tsx` - All-day entries row spanning week columns
    - `date-cell.tsx` - Date cell for month view grid
    - `more-indicator.tsx` - "+N more" indicator for overflow entries
    - `views/` - View-specific components
      - `day-view.tsx` - Day view container
      - `week-view.tsx` - Week view with 7-day grid
      - `month-view.tsx` - Month view calendar grid
- `lib/` - Utilities and services
  - `lib/utils/utils.ts` - `cn()` class merging helper
  - `lib/utils/password.ts` - `validatePassword()` client-side password validation (8+ chars, number, symbol)
  - `lib/api/` - API layer
    - `api.ts` - Typed `api<T>()` function with error/success toast handling
    - `auth.ts` - Authentication API functions (login, signup, logout, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification, refreshToken)
    - `calendar.ts` - Calendar entry CRUD operations (getEntries, createEntry, updateEntry, deleteEntry)
  - `lib/calendar/` - Calendar utilities
    - `date-utils.ts` - Date manipulation (getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth, getMonthGridDates)
    - `calendar-constants.ts` - Layout constants (HOUR_HEIGHT=60, SLOT_HEIGHT=30, TIME_COLUMN_WIDTH, START_HOUR, END_HOUR)
    - `time-utils.ts` - Time position calculations (getEventTopPosition, getEventHeight, formatHour, getTimeFromPosition)
  - `lib/hooks/` - Custom React hooks
    - `useCalendarData.ts` - Fetches calendar entries for a 3-month window around the current date, with smart caching to avoid redundant requests
  - `lib/stores/` - Zustand stores for client state
    - `userStore.ts` - Current authenticated user (id, email, emailVerified)
    - `calendarStore.ts` - Calendar view state, entries, and modal state. Uses an `entryMap` (Map by ID) for deduplication, with `loadedRanges` to track fetched date windows and avoid re-fetching.
- `proxy.ts` - Next.js middleware for route protection (auth routes, open routes, protected routes)

### Authentication

- Cookie-based auth with a NestJS backend (configured via `NEXT_PUBLIC_BACKEND_URL`)
- `AuthProvider` component wraps protected routes, redirects unauthenticated users to `/login` and unverified users to `/check-email`
- User state managed via Zustand store (`useUserStore`) — includes `emailVerified` field
- `proxy.ts` middleware handles route-level auth:
  - **Auth routes** (`/login`, `/signup`, `/forgot-password`, `/reset-password`): redirect authenticated users to `/`
  - **Open routes** (`/verify-email`, `/check-email`): accessible regardless of auth state
  - **All other routes**: redirect unauthenticated users to `/login?from={pathname}`

### Auth Flows

**Signup**: submit form → API creates user + sends verification email → redirect to `/check-email` → user clicks email link → `/verify-email?token=...` validates → `refreshToken()` updates JWT → redirect to `/`

**Login**: submit form → API sets cookies → if `emailVerified` is false redirect to `/check-email`, otherwise redirect to `/`

**Password Reset**: click "Forgot password?" → enter email at `/forgot-password` → API sends reset email → click link → `/reset-password?token=...` → enter new password (client-side validated) → redirect to `/login`

**Email Verification Resend**: at `/check-email` → click "Resend verification email" (60s cooldown) → API sends new email

### State Management

- Zustand for client-side state (`lib/stores/`)
- `useUserStore` - Current authenticated user (id, email, emailVerified)
- `useCalendarStore` - Calendar view state (Day/Week/Month), current date, entries, and entry modal state
  - `CalendarEntry` interface: id, startDate, endDate, title, wholeDay, content?
  - Smart caching: `entryMap` (Map by ID) for deduplication, `loadedRanges` to track fetched windows, `mergeEntries` to incrementally add data
  - Modal actions: openEntryModal, closeEntryModal
  - Entry actions: addEntry, updateEntry, deleteEntry, mergeEntries, clearCache

### Calendar Views

The calendar supports Day/Week/Month views (all implemented):

- **Day View**: Displays 24-hour grid with 30-minute slots
  - Entries positioned absolutely based on start time and duration
  - All-day entries shown in dedicated section above time grid
  - Current time indicator shows red line on today's view
- **Week View**: Displays 7-day grid with time columns
  - All-day entries shown in row spanning week columns
  - Day headers with weekday and date number
- **Month View**: Displays calendar grid with date cells
  - Entry previews with "+N more" overflow indicator
  - Click to navigate to day view or open entry modal

### Entry Modal

- `EntryModal` component provides create/edit/delete functionality
- Supports timed entries and all-day events
- Form fields: title, start/end dates, all-day toggle, description
- Integrates with backend API via `lib/api/calendar.ts`

### API Layer

- `lib/api/api.ts` provides a typed `api<T>()` function for backend requests
- `lib/api/auth.ts` provides authentication operations (login, signup, logout, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification, refreshToken)
- `lib/api/calendar.ts` provides calendar entry CRUD operations
- Automatic toast notifications for success/error responses
- All requests include credentials for cookie-based auth

### Security Headers

`next.config.ts` sets the following headers on all routes:
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — controls referrer information
- `X-Frame-Options: DENY` — prevents clickjacking
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables browser features
- `poweredByHeader: false` — hides the `X-Powered-By: Next.js` header

### Styling

- Tailwind CSS v4 with CSS variables for theming (defined in `app/globals.css`)
- shadcn/ui configured with "new-york" style and lucide icons (`components.json`)
- Dark mode via `.dark` class on ancestor elements
- Use `cn()` from `@/lib/utils/utils` for conditional class merging

### Testing

- Vitest with jsdom environment, React Testing Library, and `@testing-library/user-event`
- Config: `vitest.config.mts`, setup: `vitest.setup.ts`
- Tests in `__tests__/` directory (components, pages)
- Shared test utilities in `__tests__/test-utils.ts`
- Run: `pnpm test` (or `pnpm test` from monorepo root via Turborepo)

### Path Aliases

- `@/*` maps to the project root (e.g., `@/components/ui/button`)
