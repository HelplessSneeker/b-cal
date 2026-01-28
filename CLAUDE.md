# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

b-cal is a calendar application built with NestJS 11, TypeScript, Prisma 7 (PostgreSQL), and Passport-based authentication (local + JWT strategies).

## Commands

- `npm run build` — compile the project
- `npm run start:dev` — run in watch mode for development
- `npm run lint` — ESLint with auto-fix
- `npm run format` — Prettier formatting
- `npm run test` — run all unit tests (Jest)
- `npm run test -- --testPathPattern=<pattern>` — run a single test file
- `npm run test:e2e` — run end-to-end tests
- `npx prisma migrate dev` — apply database migrations
- `npx prisma generate` — regenerate Prisma client

## Infrastructure

PostgreSQL runs via `docker-compose.yml`. Start with `docker compose up -d`. Environment variables are in `.env` (PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, SECRET_KEY).

## Architecture

**Root module** (`app.module.ts`) imports: ConfigModule, PrismaModule (global), AuthModule, UsersModule, CalendarModule.

**PrismaModule** is global — it provides `PrismaService` (extends `PrismaClient` with `@prisma/adapter-pg`) to all modules without explicit imports. Connection string is built from env vars.

**Auth flow:** AuthController exposes `/auth/login` (LocalAuthGuard) and `/auth/signup`. LocalStrategy validates email+password via bcrypt. On success, AuthService issues a JWT (1h expiry). JwtStrategy extracts Bearer tokens for protected routes via JwtAuthGuard. UsersModule is exported for AuthModule to consume.

**Prisma schema** has two models: `User` (id, email, password) and `CalenderEntry` (id, title, startDate, endDate, wholeDay, content, authorId→User). Note: the model is spelled "CalenderEntry" (not "Calendar").

**Prisma client** is generated to `generated/prisma` (CommonJS format).

**Validation:** A global `ValidationPipe` is registered in `main.ts`. DTOs use `class-validator` decorators.

## Code Style

- ESLint 9 flat config with TypeScript + Prettier
- `@typescript-eslint/no-explicit-any` is OFF
- Single quotes, trailing commas (Prettier)
- `noImplicitAny` is disabled in tsconfig
