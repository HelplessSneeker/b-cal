# Concerns

## Technical Debt

### Synthetic ID Parsing
- **Location**: `apps/api/src/calendar/utils/occurrence-id.ts`, `apps/api/src/calendar/calendar.service.ts`
- **Issue**: Synthetic ID format `{UUID}:{ISO8601DateTime}` is parsed in multiple places. Logic for determining whether an ID is synthetic vs regular is scattered across the service layer.
- **Risk**: Malformed synthetic IDs could cause runtime errors. No centralized validation.

### No Shared Types Between API and Web
- **Issue**: The web frontend maintains its own TypeScript interfaces matching API responses. No shared type package exists.
- **Risk**: API and frontend types can drift silently. Changes to API response shapes require manual updates in `lib/api/` and stores.

### Custom Fetch Instead of Data Fetching Library
- **Location**: `apps/web/lib/api/api.ts`
- **Issue**: Hand-rolled fetch wrapper with 401 refresh, CSRF handling, and connection tracking. No React Query, SWR, or similar.
- **Risk**: Missing features like automatic cache invalidation, background refetching, optimistic updates, and request deduplication beyond the refresh flow.

## Performance

### Recurrence Expansion at Query Time
- **Location**: `apps/api/src/calendar/utils/expand-recurrence.ts`
- **Issue**: Virtual occurrences are generated on every `GET /calendar` request. Each recurring entry can expand up to 1000 occurrences. RecurrenceExceptions are loaded for every recurring entry.
- **Impact**: Query time scales with number of recurring entries x date range. No caching layer for expanded occurrences.

### Reminder Polling
- **Location**: `apps/api/src/reminder/reminder.service.ts`
- **Issue**: Polls database every 60 seconds for all entries with reminders. Loads all `ReminderSent` records into memory to check idempotency.
- **Scaling**: With thousands of entries, the polling query and in-memory check become expensive. No pagination on the query.

### Missing Database Indexes
- **Issue**: No composite indexes visible for common query patterns (e.g., `calendarEntry` by `userId` + `startDate`/`endDate` range).
- **Impact**: Calendar entry queries for large date ranges may not use optimal index paths.

### N+1 Potential in Reminder Processor
- **Location**: `apps/api/src/reminder/reminder.service.ts`
- **Issue**: When processing reminders, user preferences (for timezone) may be fetched per-entry rather than batched.

## Security

### CSRF Token Not Rotated After Refresh
- **Issue**: When an access token is refreshed via `POST /auth/refresh`, the CSRF token is re-fetched but not formally rotated server-side.
- **Risk**: Low — the double-submit cookie pattern mitigates most CSRF vectors regardless, but token rotation is a defense-in-depth best practice.

### Backend URL as Build-Time Constant
- **Location**: `apps/web/src/config/env.ts`, `NEXT_PUBLIC_BACKEND_URL`
- **Issue**: The backend URL is baked into the frontend build as a `NEXT_PUBLIC_` env var. Cannot be changed at runtime.
- **Risk**: Requires a full rebuild to change the API endpoint. Visible in client-side JavaScript.

### Rate Limit Bypass via Distributed IPs
- **Issue**: Rate limiting is IP-based (default `@nestjs/throttler`). No user-based rate limiting for authenticated endpoints.
- **Risk**: Attackers behind multiple IPs can bypass rate limits. Auth rate limits (5/60s) help but aren't per-account.

## Fragile Areas

### Recurring Entry Edit Logic
- **Location**: `apps/api/src/calendar/calendar.service.ts`
- **Issue**: Three distinct code paths for `SINGLE`, `THIS_AND_FUTURE`, and `ALL` edit scopes, each with different transaction logic. `THIS_AND_FUTURE` splits the series (truncates original, creates new entry).
- **Risk**: Complex transaction logic with multiple Prisma operations. Edge cases around boundary dates, exception preservation during splits, and recurrence rule changes.

### Date Math Without Timezone Awareness
- **Location**: `apps/api/src/calendar/utils/expand-recurrence.ts`
- **Issue**: Recurrence expansion uses UTC date arithmetic. User timezone is not considered during expansion.
- **Risk**: DST transitions may cause occurrences to appear at wrong times for users in timezones with daylight saving.

### Preference Snapshot in Reminders
- **Issue**: Reminder fire times are computed from entry data and user preferences at poll time. If preferences change between scheduling and sending, the reminder may fire at an unexpected time.

### Frontend Connection Guard Threshold
- **Location**: `apps/web/lib/stores/connectionStore.ts`
- **Issue**: `isBackendDown` triggers after 2 consecutive failures. If the backend is slow (not down), the overlay may flash unnecessarily.

## Test Gaps

- **No component-level tests**: Web tests cover utilities and stores but no React component rendering
- **Timezone-aware date handling**: Recurrence expansion tests use UTC only
- **Concurrent reminder processing**: No tests for overlapping poll cycles
- **Calendar entry validation edge cases**: Boundary conditions for recurrence rules
- **CSRF token lifecycle**: No E2E coverage for CSRF rotation scenarios
- **Session eviction**: Limited coverage for the 5-session limit and eviction ordering

## Scaling Limits

- **Database connections**: Default Prisma pool. No explicit pool size configuration in schema (optional env vars exist but aren't set by default).
- **Redis reliability**: BullMQ jobs are lost if Redis crashes before processing. No dead-letter queue or persistent storage fallback.
- **Reminder overlap**: If the 60s poll takes longer than 60s (large dataset), the next poll may overlap. No lock mechanism to prevent duplicate processing.
- **Single-instance assumption**: Reminder polling and session cleanup run on `@nestjs/schedule`. Multiple API instances would cause duplicate processing without distributed locking.
