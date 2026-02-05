# CLAUDE.md

## Project Overview

b-cal is a calendar REST API built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT with refresh tokens).

## Commands

- `npm run build` — compile the project
- `npm run start:dev` — run in watch mode
- `npm run lint` — ESLint with auto-fix
- `npm run format` — Prettier formatting
- `npm run test` — run unit tests (Jest 30)
- `npm run test -- --testPathPatterns=<pattern>` — run specific tests (note: Jest 30 uses `--testPathPatterns`, not `--testPathPattern`)
- `npm run test:cov` — run tests with coverage
- `npm run test:e2e` — run e2e tests (uses separate test database)
- `npm run prisma:seed` — seed database with test data (prompts for confirmation, use `--force` to skip)
- `npx prisma migrate dev` — apply migrations
- `npx prisma generate` — regenerate Prisma client
- `docker compose up -d` — start PostgreSQL

## Infrastructure

PostgreSQL 16 runs via `docker-compose.yml`. Environment variables in `.env` (dev) and `.env.test` (e2e tests):
- `PORT` (default 3000), `FRONTEND_URL` (CORS origin)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `SECRET_KEY` (access token), `REFRESH_SECRET_KEY` (refresh token)

## Database Seeding

Run `npm run prisma:seed` to populate the database with test data. The seed script creates:

**Test users** (password for all: `password123!`):
- `alice@example.com`
- `bob@example.com`

**Sample calendar entries:** 3 entries distributed between the test users.

## Test Database

E2e tests use a separate database (`b_cal_test`) configured in `.env.test`. Running `npm run test:e2e` automatically:
1. Drops and recreates the test database
2. Runs all migrations
3. Seeds with test data
4. Executes tests

## Architecture

**Modules:** AppModule imports ConfigModule, PrismaModule (global), AuthModule, UsersModule, CalendarModule.

**File structure:**
```
src/
├── auth/           # Auth controller, service, strategies, guards, decorators, validators
├── users/          # UsersService for database operations
├── calendar/       # CalendarController, CalendarService, DTOs, validators
├── prisma/         # PrismaModule (global), PrismaService
└── main.ts         # Bootstrap with CORS, cookies, validation pipe
```

**Auth flow:** Tokens stored in httpOnly cookies (not Bearer headers). Refresh tokens are bcrypt-hashed in DB.
- `POST /auth/signup` — creates user, sets token cookies. Password: min 8 chars, requires number + symbol.
- `POST /auth/login` — LocalAuthGuard validates email+password, sets access_token (1h) + refresh_token (7d) cookies
- `POST /auth/refresh` — JwtRefreshAuthGuard validates refresh token, issues new token pair
- `POST /auth/logout` — JwtAuthGuard required, clears cookies and invalidates refresh token
- `GET /auth/me` — JwtAuthGuard required, returns `{ id, email }`

**Calendar endpoints:** All require JwtAuthGuard.
- `POST /calendar` — create entry (title, startDate, endDate required; content optional)
- `GET /calendar` — list user's entries; optional `startDate`/`endDate` query params for date range filtering
- `GET /calendar/:id` — get single entry (404 if not found or not owned)
- `PATCH /calendar/:id` — update entry (partial updates supported)
- `DELETE /calendar/:id` — delete entry

**Strategies:** LocalStrategy (bcrypt, 10 rounds), JwtStrategy (reads access_token cookie), JwtRefreshStrategy (reads refresh_token cookie).

**Guards:** LocalAuthGuard, JwtAuthGuard, JwtRefreshAuthGuard — use on protected routes.

**Custom decorators:** `@User()` — extracts JwtUser (`{ id, email }`) from request in JWT-protected routes.

**Custom validators:**
- `@IsValidPassword()` — enforces password complexity (8+ chars, number, symbol)
- `@IsStartBeforeEnd()` — validates startDate ≤ endDate on calendar DTOs

**Prisma schema:** `User` (id, email, password, refreshToken) and `CalenderEntry` (id, title, startDate, endDate, content, userId→User). Note: model spelled "CalenderEntry".

**API docs:** Swagger at `/api`.

## Code Style

- ESLint 9 flat config + Prettier
- Single quotes, trailing commas
- `noImplicitAny` disabled
- TypeScript target: ES2023
