# b-cal

A full-stack calendar application built as a Turborepo monorepo.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend**: NestJS 11, Prisma 7, PostgreSQL 16, Passport JWT
- **Tooling**: Turborepo, pnpm workspaces, TypeScript, ESLint, Docker

## Features

- Calendar with Day, Week, and Month views
- Create, edit, and delete calendar entries (timed and all-day)
- Cookie-based JWT authentication (access + refresh tokens)
- Email verification on signup
- Password reset via email
- Swagger API documentation

## Prerequisites

- Node.js
- pnpm
- Docker and Docker Compose

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

Or start them individually:

```bash
pnpm dev:web    # Frontend at http://localhost:8080
pnpm dev:api    # API at http://localhost:3000
```

The API Swagger docs are available at [http://localhost:3000/api](http://localhost:3000/api).

## Project Structure

```
b-cal/
├── apps/
│   ├── api/    # NestJS REST API
│   └── web/    # Next.js frontend
├── turbo.json  # Turborepo configuration
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both web and API in watch mode |
| `pnpm dev:web` | Start only the frontend |
| `pnpm dev:api` | Start only the API |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |

See individual app READMEs for app-specific commands.

## Documentation

- [API Documentation](apps/api/README.md) - NestJS backend setup, endpoints, database schema
- [Web Documentation](apps/web/README.md) - Next.js frontend setup, project structure, auth flows

## Test Users

After running `pnpm prisma:seed` in the API:

| Email | Password |
|-------|----------|
| alice@example.com | password123! |
| bob@example.com | password123! |
