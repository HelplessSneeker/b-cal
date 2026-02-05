# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start development server (http://localhost:8080)
pnpm build    # Production build
pnpm lint     # Run ESLint
```

## Architecture

This is a Next.js 16 application using the App Router with React 19 and TypeScript.

### Key Directories

- `app/` - Next.js App Router pages and layouts
  - `app/login/` - Login page
  - `app/signup/` - Signup page
  - `app/page.tsx` - Main calendar page (protected by AuthProvider)
- `components/` - React components
  - `components/ui/` - shadcn/ui primitives (avatar, button, calendar, card, checkbox, dialog, dropdown-menu, field, input, label, loading, scroll-area, separator, sonner, spinner, textarea)
  - `components/AuthProvider.tsx` - Wraps protected routes, redirects unauthenticated users
  - `components/login-form.tsx` - Shared form for login/signup pages
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
  - `lib/api/` - API layer
    - `api.ts` - Typed `api<T>()` function with error/success toast handling
    - `auth.ts` - Authentication API functions (login, signup, logout, getMe)
    - `calendar.ts` - Calendar entry CRUD operations (getEntries, createEntry, updateEntry, deleteEntry)
  - `lib/calendar/` - Calendar utilities
    - `date-utils.ts` - Date manipulation (getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth, getMonthGridDates)
    - `calendar-constants.ts` - Layout constants (HOUR_HEIGHT=60, SLOT_HEIGHT=30, TIME_COLUMN_WIDTH, START_HOUR, END_HOUR)
    - `time-utils.ts` - Time position calculations (getEventTopPosition, getEventHeight, formatHour, getTimeFromPosition)
  - `lib/stores/` - Zustand stores for client state
    - `userStore.ts` - Current authenticated user
    - `calendarStore.ts` - Calendar view state, entries, and modal state

### Authentication

- Cookie-based auth with a NestJS backend (configured via `NEXT_PUBLIC_BACKEND_URL`)
- `AuthProvider` component wraps protected routes and redirects unauthenticated users
- User state managed via Zustand store (`useUserStore`)

### State Management

- Zustand for client-side state (`lib/stores/`)
- `useUserStore` - Current authenticated user
- `useCalendarStore` - Calendar view state (Day/Week/Month), current date, entries array, and entry modal state
  - `CalendarEntry` interface: id, startDate, endDate, title, wholeDay, content?
  - Modal actions: openEntryModal, closeEntryModal
  - Entry actions: addEntry, updateEntry, deleteEntry, setEntries

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
- `lib/api/calendar.ts` provides calendar entry CRUD operations
- Automatic toast notifications for success/error responses
- All requests include credentials for cookie-based auth

### Styling

- Tailwind CSS v4 with CSS variables for theming (defined in `app/globals.css`)
- shadcn/ui configured with "new-york" style and lucide icons (`components.json`)
- Dark mode via `.dark` class on ancestor elements
- Use `cn()` from `@/lib/utils/utils` for conditional class merging

### Path Aliases

- `@/*` maps to the project root (e.g., `@/components/ui/button`)
