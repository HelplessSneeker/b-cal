# b-cal

A calendar application with a Next.js frontend and NestJS API backend.

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

## Project Structure

```
b-cal/
├── apps/
│   ├── api/    # NestJS REST API
│   └── web/    # Next.js frontend
├── turbo.json  # Turborepo configuration
└── package.json
```

## Documentation

- [API Documentation](apps/api/README.md) - NestJS backend setup, available scripts, API endpoints
- [Web Documentation](apps/web/README.md) - Next.js frontend setup, project structure, features

## Test Users

After running `pnpm prisma:seed` in the API:

| Email | Password |
|-------|----------|
| alice@example.com | password123! |
| bob@example.com | password123! |
