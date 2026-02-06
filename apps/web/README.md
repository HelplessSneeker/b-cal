# @b-cal/web

A calendar application frontend built with Next.js 16, React 19, and TypeScript.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (new-york style)
- Zustand for state management

## Features

- **Authentication**: Cookie-based auth with login/signup flows
- **Email Verification**: Post-signup email verification with resend support
- **Password Reset**: Forgot password and reset password flows via email
- **Calendar Views**: Day, Week, and Month views
- **Entry Management**: Create, edit, and delete calendar entries
- **All-Day Events**: Support for timed entries and all-day events
- **Current Time Indicator**: Red line showing current time on today's view

## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

Configure the backend URL:

```
NEXT_PUBLIC_BACKEND_URL=<your-backend-url>
```

### Development

```bash
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  login/                # Login page
  signup/               # Signup page
  check-email/          # Post-signup email verification prompt
  verify-email/         # Email verification callback (?token=...)
  forgot-password/      # Password reset request form
  reset-password/       # Password reset form (?token=...)
  page.tsx              # Main calendar page (protected)
components/             # React components
  ui/                   # shadcn/ui primitives
  calendar/             # Calendar-specific components
    views/              # Day, Week, Month view components
    calendar-header.tsx # Top navigation with view selector
    calendar-sidebar.tsx # Left sidebar with mini calendar
    time-grid.tsx       # Scrollable time grid
    day-column.tsx      # Single day column with time slots
    entry-block.tsx     # Positioned calendar entry block
  AuthProvider.tsx      # Auth wrapper (redirects unverified users)
  login-form.tsx        # Shared login/signup form
  entry-modal.tsx       # Create/edit/delete entry modal
  verify-email-content.tsx  # Email verification handler
  reset-password-form.tsx   # Password reset form component
lib/                    # Utilities and services
  api/                  # API layer with typed requests
  calendar/             # Date/time utilities and constants
  stores/               # Zustand stores (user, calendar)
  utils/                # Helper functions (cn, password validation)
proxy.ts                # Next.js middleware for route protection
```

## Auth Flows

### Signup
1. User submits email/password at `/signup`
2. API creates user and sends verification email
3. User is redirected to `/check-email`
4. User clicks link in email, lands on `/verify-email?token=...`
5. Token is validated, user is redirected to main app

### Password Reset
1. User clicks "Forgot password?" on login page
2. User enters email at `/forgot-password`
3. API sends reset email (silent on non-existent emails)
4. User clicks link, lands on `/reset-password?token=...`
5. User enters new password, gets redirected to `/login`
