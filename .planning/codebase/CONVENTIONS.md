# Conventions

## Code Style

- **ESLint 9** flat config + **Prettier** (single quotes, trailing commas)
- **TypeScript** target ES2023; `noImplicitAny` disabled in API
- Enforced via lint-staged pre-commit hook (Husky)
- Path alias: `@/*` maps to project root in web (`@/components/ui/button`)
- API uses `src/` relative imports: `import { PrismaService } from 'src/prisma/prisma.service'`

## Naming

### API
- **Classes**: PascalCase (`CalendarService`, `JwtAuthGuard`, `CreateCalendarDto`)
- **Files**: kebab-case with type suffix (`calendar.service.ts`, `jwt-auth.guard.ts`, `create-calendar.dto.ts`)
- **Enums**: PascalCase names, UPPER_SNAKE values (`EditScope.THIS_AND_FUTURE`, `RecurrenceFrequency.WEEKLY`)
- **Constants**: UPPER_SNAKE (`SESSION_MAX_SESSIONS`, `REQUEST_ID_HEADER`)
- **Decorators**: PascalCase with `@` prefix (`@User()`, `@IsValidPassword()`)

### Web
- **Components**: PascalCase exports, kebab-case files (`calendar-header.tsx` exports `CalendarHeader`)
- **Stores**: camelCase files, `use{Name}Store` hook pattern (`calendarStore.ts` → `useCalendarStore`)
- **Hooks**: `use{Name}` in `use{Name}.ts` files
- **Utilities**: camelCase files and exports (`date-utils.ts`, `overlap-utils.ts`)
- **CSS**: Tailwind utility classes via `cn()` from `@/lib/utils/utils`

## Patterns

### API Module Pattern
Each feature is a self-contained NestJS module:
```
{feature}/
├── {feature}.module.ts       # Module declaration
├── {feature}.controller.ts   # HTTP endpoints
├── {feature}.service.ts      # Business logic
├── dto/                      # Request validation
├── enums/                    # Domain enums
├── validators/               # Custom class-validator decorators
└── utils/                    # Feature-specific helpers
```

### DTO Validation
- `class-validator` decorators on DTO properties
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Custom validators for complex rules: `@IsStartBeforeEnd()`, `@IsRecurrenceValid()`, `@IsReminderValid()`
- Max lengths enforced: email 254, password 128, title 100, content 5000
- HTML stripping via `stripHtmlTags()` utility on title/content fields

### Guard Composition
Controllers use stacked guards:
```typescript
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
```
- `JwtAuthGuard` — validates access_token cookie
- `EmailVerifiedGuard` — checks `emailVerified` flag
- `LocalAuthGuard` — validates email/password (login only)

### Zustand Store Pattern
Web stores follow a consistent pattern:
```typescript
interface StoreState {
  // State
  data: Type[];
  isLoading: boolean;
  // Actions
  fetchData: () => Promise<void>;
  setData: (data: Type[]) => void;
}

export const useStore = create<StoreState>()((set, get) => ({
  // Implementation
}));
```
State persisted to localStorage where needed (view, currentDate, hiddenCalendarIds).

### API Client Pattern
All API calls go through the `api()` wrapper in `lib/api/api.ts`:
- Automatic CSRF token injection via `x-csrf-token` header
- 401 interception with silent token refresh (promise deduplication)
- CSRF 403 auto-retry (re-fetches token, retries once)
- Connection failure tracking via `connectionStore`
- `X-Request-Id` generation for request correlation

## Error Handling

### API
- `GlobalExceptionFilter` (`src/common/filters/global-exception.filter.ts`) catches all exceptions
- Extends `SentryGlobalFilter` for automatic error reporting
- Includes `requestId` in error responses
- Known exceptions (HttpException) return structured error; unknown become 500
- Business errors thrown as NestJS built-in exceptions (`BadRequestException`, `NotFoundException`, `UnauthorizedException`)

### Web
- `error.tsx` and `global-error.tsx` for React error boundaries
- API errors surfaced via `sonner` toast notifications
- `ApiError` class wraps non-OK responses with status and message
- `ConnectionGuard` shows overlay for backend connectivity failures

## Async Patterns

### API
- Controllers and services are fully async (`async/await`)
- Prisma operations are awaited directly (no manual promise chaining)
- Complex mutations use Prisma `$transaction()` (e.g., recurring entry edits)
- Background work via BullMQ queues (`mail`, `reminder`) with 3 retries + exponential backoff

### Web
- React hooks for data fetching (`useCalendarData`)
- Store actions are async, update state via `set()`
- No React Query / SWR — custom fetch with Zustand
- `useEffect` for initial data loads with cleanup

## Import Organization

### API
1. Node built-ins (`crypto`, `path`)
2. NestJS framework (`@nestjs/*`)
3. Third-party (`bcrypt`, `nodemailer`, etc.)
4. Internal modules (`src/prisma/...`, `src/auth/...`)
5. Local files (`./dto/...`, `./utils/...`)

### Web
1. React/Next.js (`react`, `next/*`)
2. Third-party (`zustand`, `next-intl`, `lucide-react`)
3. Internal via alias (`@/components/...`, `@/lib/...`)
4. Local relative (`./...`)
