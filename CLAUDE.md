# CLAUDE.md

## Project Overview

b-cal is a calendar REST API built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT with refresh tokens). Authentication is complete; calendar features are in progress.

## Commands

- `npm run build` — compile the project
- `npm run start:dev` — run in watch mode
- `npm run lint` — ESLint with auto-fix
- `npm run format` — Prettier formatting
- `npm run test` — run unit tests (Jest 30)
- `npm run test -- --testPathPattern=<pattern>` — run specific tests
- `npm run test:cov` — run tests with coverage
- `npm run test:e2e` — run e2e tests
- `npx prisma migrate dev` — apply migrations
- `npx prisma generate` — regenerate Prisma client
- `docker compose up -d` — start PostgreSQL

## Infrastructure

PostgreSQL 16 runs via `docker-compose.yml`. Environment variables in `.env`:
- `PORT` (default 3000), `FRONTEND_URL` (CORS origin)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `SECRET_KEY` (access token), `REFRESH_SECRET_KEY` (refresh token)

## Architecture

**Modules:** AppModule imports ConfigModule, PrismaModule (global), AuthModule, UsersModule, CalendarModule.

**File structure:**
```
src/
├── auth/           # Auth controller, service, strategies, guards, decorators, validators
├── users/          # UsersService for database operations
├── calendar/       # CalendarController, CalendarService (WIP)
├── prisma/         # PrismaModule (global), PrismaService
└── main.ts         # Bootstrap with CORS, cookies, validation pipe
```

**Auth flow:** Tokens stored in httpOnly cookies (not Bearer headers). Refresh tokens are bcrypt-hashed in DB.
- `POST /auth/signup` — creates user, sets token cookies. Password: min 8 chars, requires number + symbol.
- `POST /auth/login` — LocalAuthGuard validates email+password, sets access_token (1h) + refresh_token (7d) cookies
- `POST /auth/refresh` — JwtRefreshAuthGuard validates refresh token, issues new token pair
- `POST /auth/logout` — JwtAuthGuard required, clears cookies and invalidates refresh token
- `GET /auth/me` — JwtAuthGuard required, returns `{ id, email }`

**Strategies:** LocalStrategy (bcrypt, 10 rounds), JwtStrategy (reads access_token cookie), JwtRefreshStrategy (reads refresh_token cookie).

**Guards:** LocalAuthGuard, JwtAuthGuard, JwtRefreshAuthGuard — use on protected routes.

**Custom decorators:** `@User()` — extracts JwtUser (`{ id, email }`) from request in JWT-protected routes.

**Custom validators:** `@IsValidPassword()` — enforces password complexity (8+ chars, number, symbol).

**Prisma schema:** `User` (id, email, password, refreshToken) and `CalenderEntry` (id, title, startDate, endDate, wholeDay, content, authorId→User). Note: model spelled "CalenderEntry".

**API docs:** Swagger at `/api`.

## Code Style

- ESLint 9 flat config + Prettier
- Single quotes, trailing commas
- `noImplicitAny` disabled
- TypeScript target: ES2023
