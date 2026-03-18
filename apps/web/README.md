# @b-cal/web

The frontend for b-cal — a calendar application built with Next.js 16 and React 19.

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=fff)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=fff)
![Zustand](https://img.shields.io/badge/Zustand-433e38?logo=react&logoColor=fff)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=fff)

## Features

- **Calendar Views** — Day, Week, and Month with time grids and all-day event support
- **Entry Management** — Create, edit, and delete calendar entries via modal dialog
- **Authentication** — Cookie-based auth with login, signup, email verification, and password reset
- **Current Time Indicator** — Red line showing current time on today's view
- **Silent Token Refresh** — Automatic 401 retry with deduplication
- **Recurring Entries** — DAILY, WEEKLY, MONTHLY recurrence with scope editing (single/future/all)
- **Email Reminders** — Configurable reminders (minutes/hours/days before) for calendar entries
- **Named Calendars** — Multiple calendars with custom colors and visibility toggling
- **Settings** — Profile, security (password change, sessions), appearance (theme, accent, week start), localization (language, timezone)
- **i18n** — EN/DE translations via `next-intl`
- **CSRF Protection** — Auto-fetches and sends CSRF tokens on state-changing requests

## Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/) 10+
- Running API backend (see [API README](../api/README.md))

## Getting Started

```bash
# Configure environment
cp .env.example .env  # Set NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server on port 8080 |
| `pnpm build` | Production build (standalone output) |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run integration tests (Vitest) |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting without fixing |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | API base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error monitoring |

## Project Structure

```
app/                          # Next.js App Router pages
├── login/                    # Login page
├── signup/                   # Signup page
├── check-email/              # Post-signup verification prompt
├── verify-email/             # Email verification callback
├── forgot-password/          # Password reset request
├── reset-password/           # Password reset form
├── settings/                 # Settings (profile, security, appearance, localization)
├── health/                   # Health check route
└── page.tsx                  # Main calendar (protected)

components/
├── ui/                       # shadcn/ui primitives
├── calendar/
│   ├── views/                # Day, Week, Month view components
│   ├── calendar-header.tsx   # Top nav with view selector & user menu
│   ├── calendar-sidebar.tsx  # Sidebar with mini calendar
│   ├── time-grid.tsx         # Scrollable 24h time grid
│   ├── day-column.tsx        # Single day with time slots
│   └── entry-block.tsx       # Positioned calendar entry
├── settings/                  # Settings tabs (profile, security, appearance, localization)
├── app-shell.tsx              # Layout with desktop icon rail and mobile bottom tab bar
├── AuthProvider.tsx           # Auth guard (redirects unauthenticated/unverified)
├── ConnectionGuard.tsx        # Full-screen overlay when backend is unreachable
├── entry-modal.tsx            # Create/edit/delete entry dialog
├── login-form.tsx             # Shared login/signup form
├── verify-email-content.tsx   # Email verification handler
└── reset-password-form.tsx    # Password reset form

lib/
├── api/                      # Typed API layer (auth, calendar, CSRF)
├── calendar/                 # Date/time utils and layout constants
├── hooks/                    # Custom hooks (useCalendarData)
├── stores/                   # Zustand stores (user, calendar, calendars, connection)
└── utils/                    # Helpers (cn, password validation, accent color)

proxy.ts                      # Route protection + CSP nonce (Next.js 16 proxy)
```

## Auth Flows

**Signup** — Submit form → API sends verification email → redirect to `/check-email` → click email link → `/verify-email?token=...` validates → redirect to `/`

**Login** — Submit form → API sets cookies → redirect to `/` (or `/check-email` if unverified)

**Password Reset** — "Forgot password?" → enter email → API sends reset email → `/reset-password?token=...` → new password → redirect to `/login`

## Docker

Multi-stage Dockerfile using Node 24 Alpine with Next.js standalone output. Requires `NEXT_PUBLIC_BACKEND_URL` as a build arg. Exposes port 8080.

```bash
# Build from monorepo root
docker build -f apps/web/Dockerfile -t b-cal-web --build-arg NEXT_PUBLIC_BACKEND_URL=http://api:3000 .

# Run
docker run -p 8080:8080 b-cal-web
```
