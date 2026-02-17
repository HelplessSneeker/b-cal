# b-cal

A full-stack calendar application built as a Turborepo monorepo.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=fff)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?logo=nestjs&logoColor=fff)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=fff)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?logo=postgresql&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=fff)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=fff)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=fff)

## Features

- Calendar with **Day**, **Week**, and **Month** views
- Create, edit, and delete calendar entries (timed and all-day)
- Cookie-based JWT authentication (access + refresh tokens)
- Email verification on signup
- Password reset via email
- Swagger API documentation (development)

## Project Structure

```
b-cal/
├── apps/
│   ├── api/     # NestJS REST API      → localhost:3000
│   └── web/     # Next.js frontend     → localhost:8080
├── turbo.json   # Turborepo pipeline config
└── package.json # Root scripts & shared devDependencies
```

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+
- [Docker](https://www.docker.com/)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the API

```bash
cd apps/api

# Copy and configure environment variables
cp .env.example .env  # Edit with your values

# Start PostgreSQL
docker compose up -d

# Generate Prisma client and run migrations
pnpm prisma:generate
pnpm prisma:migrate

# (Optional) Seed the database with test data
pnpm prisma:seed
```

### 3. Set up the web frontend

```bash
cd apps/web

# Copy and configure environment variables
cp .env.example .env  # Set NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 4. Start development servers

From the monorepo root:

```bash
pnpm dev        # Start both web and API
```

Or individually:

```bash
pnpm dev:web    # Frontend at http://localhost:8080
pnpm dev:api    # API at http://localhost:3000
```

Swagger docs are available at [http://localhost:3000/api](http://localhost:3000/api) during development.

### Docker Compose (full stack)

Alternatively, run the entire stack with Docker — no local Node.js or database setup required:

```bash
docker compose up
```

This starts four services:

| Service | Description | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 database | 5432 |
| `migrate` | Runs Prisma migrations, then exits | — |
| `api` | NestJS API (waits for migrations) | 3000 |
| `web` | Next.js frontend (waits for API health) | 8080 |

Data is persisted in a `postgres_data` Docker volume. The API uses hardcoded dev secrets — **do not use this compose file in production**.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start both web and API in watch mode |
| `pnpm dev:web` | Start only the frontend |
| `pnpm dev:api` | Start only the API |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm format` | Format all packages with Prettier |
| `pnpm format:check` | Check formatting without fixing |

See individual app READMEs for app-specific commands.

## Test Users

After running `pnpm prisma:seed` in the API:

| Email | Password |
|---|---|
| `alice@example.com` | `password123!` |
| `bob@example.com` | `password123!` |

## Documentation

- **[API](apps/api/README.md)** — NestJS backend: endpoints, database schema, environment setup
- **[Web](apps/web/README.md)** — Next.js frontend: project structure, auth flows, calendar views

## License

UNLICENSED
