# CLAUDE.md

## Project Overview

b-cal is a calendar application built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT with refresh tokens).

## Commands

- `npm run build` — compile the project
- `npm run start:dev` — run in watch mode
- `npm run lint` — ESLint with auto-fix
- `npm run format` — Prettier formatting
- `npm run test` — run unit tests (Jest)
- `npm run test -- --testPathPattern=<pattern>` — run specific tests
- `npm run test:e2e` — run e2e tests
- `npx prisma migrate dev` — apply migrations
- `npx prisma generate` — regenerate Prisma client

## Infrastructure

PostgreSQL runs via `docker-compose.yml` (`docker compose up -d`). Environment variables in `.env`: PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, SECRET_KEY, REFRESH_SECRET_KEY.

## Architecture

**Modules:** AppModule imports ConfigModule, PrismaModule (global), AuthModule, UsersModule, CalendarModule.

**Auth flow:** Tokens stored in httpOnly cookies (not Bearer headers).
- `/auth/login` — LocalAuthGuard validates email+password, sets access_token (1h) + refresh_token (7d) cookies
- `/auth/signup` — creates user, sets token cookies
- `/auth/refresh` — JwtRefreshAuthGuard validates refresh token, issues new token pair
- `/auth/logout` — clears cookies and invalidates refresh token

Strategies: LocalStrategy (bcrypt), JwtStrategy (reads access_token cookie), JwtRefreshStrategy (reads refresh_token cookie).

**Prisma schema:** `User` (id, email, password, refreshToken) and `CalenderEntry` (id, title, startDate, endDate, wholeDay, content, authorId→User). Note: model spelled "CalenderEntry".

**API docs:** Swagger at `/api`.

## Code Style

- ESLint 9 flat config + Prettier
- Single quotes, trailing commas
- `noImplicitAny` disabled
