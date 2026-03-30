# Testing

## Frameworks

| App | Framework | Runner | Config |
|-----|-----------|--------|--------|
| API | Jest 30 + ts-jest | `pnpm test` / `npx jest --testPathPatterns=<pattern>` | `apps/api/package.json` ("jest" key) |
| API E2E | Jest + Supertest | `pnpm test:e2e` | `apps/api/test/jest-e2e.json` |
| Web | Vitest + React Testing Library | `pnpm test` | `apps/web/vitest.config.mts` |

## API Unit Tests

### Location
Co-located with source files as `*.spec.ts`:
- `src/auth/auth.controller.spec.ts`
- `src/auth/auth.service.spec.ts`
- `src/auth/session.service.spec.ts`
- `src/auth/session-cleanup.service.spec.ts`
- `src/auth/guard/email-verified.guard.spec.ts`
- `src/auth/strategy/jwt.strategy.spec.ts`, `jwt-refresh.strategy.spec.ts`, `local.strategy.spec.ts`
- `src/auth/validators/password.validator.spec.ts`
- `src/calendar/calendar.controller.spec.ts`
- `src/calendar/calendar.service.spec.ts`
- `src/calendar/utils/expand-recurrence.spec.ts`, `occurrence-id.spec.ts`
- `src/calendar/validators/date-range.validator.spec.ts`, `recurrence.validator.spec.ts`
- `src/calendars/calendars.controller.spec.ts`, `calendars.service.spec.ts`
- `src/user/user.controller.spec.ts`, `user.service.spec.ts`, `validators/timezone.validator.spec.ts`
- `src/mail/mail.service.spec.ts`, `mail-queue.service.spec.ts`, `mail.processor.spec.ts`
- `src/reminder/reminder.processor.spec.ts`
- `src/health/health.controller.spec.ts`, `redis-health.indicator.spec.ts`
- `src/common/filters/global-exception.filter.spec.ts`
- `src/common/utils/strip-html-tags.spec.ts`

### Mocking Strategy
- **Prisma**: Manually mocked via `jest.fn()` objects matching Prisma client methods
  ```typescript
  const mockPrismaService = {
    calendarEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // ...
  };
  ```
- **Prisma client module**: Mocked at module level to avoid import errors
  ```typescript
  jest.mock('generated/prisma/client', () => ({
    PrismaClient: class PrismaClient {},
  }));
  jest.mock('generated/prisma/browser', () => ({}));
  ```
- **NestJS Testing Module**: `Test.createTestingModule()` with mocked providers
- **Services**: Injected via NestJS DI with `jest.fn()` implementations

### Test Structure
```typescript
describe('ServiceName', () => {
  let service: ServiceUnderTest;
  let dependency: MockedDependency;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceUnderTest,
        { provide: Dependency, useValue: mockDependency },
      ],
    }).compile();
    service = module.get(ServiceUnderTest);
  });

  describe('methodName', () => {
    it('should do expected behavior', async () => {
      mockDependency.method.mockResolvedValue(result);
      const result = await service.method(args);
      expect(result).toEqual(expected);
    });
  });
});
```

## API E2E Tests

### Location
`apps/api/test/`:
- `auth.e2e-spec.ts` — Full auth flow (signup, login, refresh, logout, sessions)
- `calendar.e2e-spec.ts` — Calendar CRUD, recurring entries, edit scopes
- `user.e2e-spec.ts` — User preferences, account deletion

### Setup
- `global-setup.ts` — Database setup/migration before tests
- `setup-env.ts` — Test environment variables (uses `b_cal_test` database)
- Uses Supertest for HTTP assertions against a running NestJS app
- CI spins up PostgreSQL 16 + Redis 7 for E2E tests

## Web Integration Tests

### Location
`apps/web/__tests__/`:
- `lib/api/api.test.ts` — API client (401 refresh, CSRF retry, connection tracking)
- `lib/calendar/date-utils.test.ts` — Date calculation utilities
- `lib/calendar/overlap-utils.test.ts` — Entry overlap calculations
- `lib/calendar/spanning-utils.test.ts` — Multi-day entry spanning
- `lib/stores/calendarStore.test.ts` — Calendar store actions/state
- `lib/stores/connectionStore.test.ts` — Connection health tracking

### Mocking Strategy
- **fetch**: `vi.stubGlobal('fetch', mockFetch)` with `vi.fn()` implementations
- **External modules**: `vi.mock('sonner', ...)` for toast suppression
- **Zustand stores**: Direct state manipulation via `store.setState()`
- **Environment**: `NEXT_PUBLIC_BACKEND_URL` set in vitest config

### Test Structure
```typescript
describe('featureName', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should handle scenario', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, data));
    const result = await api('/endpoint');
    expect(result).toEqual(expected);
  });
});
```

## CI Integration

Tests run in GitHub Actions (`.github/workflows/test.yml`):
- Unit tests: `pnpm test` at root (runs both API and web tests)
- E2E tests: Spins up PostgreSQL 16 + Redis 7 services
- Triggered on push to main and PRs to main

## Pre-commit

Husky runs all tests on commit via pre-commit hook alongside lint-staged (ESLint + Prettier).

## Coverage

- No formal coverage thresholds configured
- `pnpm test:cov` available for API (Jest `--coverage`)
- Good coverage on: auth flows, calendar CRUD, recurring entry expansion, validators
- Lower coverage on: reminder processing, mail queue, web components (no component-level tests)
