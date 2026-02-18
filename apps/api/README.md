# @b-cal/api

The REST API for b-cal — a calendar application built with NestJS 11, Prisma, and PostgreSQL.

![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?logo=nestjs&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=fff)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?logo=postgresql&logoColor=fff)
![Jest](https://img.shields.io/badge/Jest_30-C21325?logo=jest&logoColor=fff)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)

## Features

- Cookie-based JWT authentication (access + refresh tokens in httpOnly cookies)
- Email verification on signup (JWT token, 1 day expiry)
- Password reset via email (JWT token, 1 hour expiry)
- CSRF protection (double-submit cookie pattern)
- Calendar entry CRUD with date range filtering
- Rate limiting (global + stricter auth endpoints)
- Structured logging with request IDs (nestjs-pino)
- Health checks (database, memory, disk)
- Swagger API documentation (development only)
- Sentry error monitoring

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+
- [Docker](https://www.docker.com/)

## Getting Started

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies (from monorepo root)
pnpm install

# Configure environment
cp .env.example .env  # Edit with your values

# Generate Prisma client and run migrations
pnpm prisma:generate
pnpm prisma:migrate

# (Optional) Seed with test data
pnpm prisma:seed

# Start development server
pnpm dev
```

The API will be available at [http://localhost:3000](http://localhost:3000).
Swagger docs at [http://localhost:3000/api](http://localhost:3000/api).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run in watch mode |
| `pnpm build` | Compile the project |
| `pnpm start:prod` | Run compiled output |
| `pnpm lint` | ESLint with auto-fix |
| `pnpm format` | Prettier formatting |
| `pnpm test` | Run unit tests (Jest) |
| `pnpm test:e2e` | Run e2e tests (separate test database) |
| `pnpm test:cov` | Tests with coverage report |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm prisma:migrate` | Apply database migrations |
| `pnpm prisma:seed` | Seed database with test data |
| `pnpm prisma:studio` | Browse database with Prisma Studio |

## Environment Variables

Create a `.env` file:

```env
# App
PORT=3000
FRONTEND_URL="http://localhost:8080/"

# Database
DB_USER=root
DB_PASSWORD=root
DB_NAME=b_cal
DB_PORT=5432
DB_HOST=localhost

# Secrets (min 32 characters each)
SECRET_KEY="your-access-token-secret-key-here"
REFRESH_SECRET_KEY="your-refresh-token-secret-key"
MAIL_SECRET_KEY="your-mail-token-secret-key-here"
CSRF_SECRET="your-csrf-secret-key-here-32chars"

# Mail (optional in development — uses Ethereal test accounts)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=user@example.com
MAIL_PASS=password
MAIL_FROM="b-cal <noreply@b-cal.dev>"  # optional

# Optional
SENTRY_DSN=
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT_MS=10000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
```

For e2e tests, create `.env.test` with `DB_NAME=b_cal_test` (copy the rest from `.env`).

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/csrf-token` | — | Get CSRF token (sets cookie) |
| `POST` | `/auth/signup` | — | Register new user, sends verification email |
| `POST` | `/auth/login` | — | Login with email and password |
| `POST` | `/auth/refresh` | Refresh | Refresh access and refresh tokens |
| `POST` | `/auth/logout` | JWT | Logout and invalidate refresh token |
| `GET` | `/auth/me` | JWT | Get current user info |
| `POST` | `/auth/resend-verification` | JWT | Resend verification email |
| `GET` | `/auth/verify-email?token=` | — | Verify email address |
| `POST` | `/auth/forgot-password` | — | Request password reset email |
| `POST` | `/auth/reset-password` | — | Reset password with token |

### Calendar

All endpoints require JWT + verified email.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/calendar` | Create entry (title, startDate, endDate required) |
| `GET` | `/calendar` | List entries (optional `startDate`/`endDate` filters) |
| `GET` | `/calendar/:id` | Get single entry |
| `PATCH` | `/calendar/:id` | Update entry (partial) |
| `DELETE` | `/calendar/:id` | Delete entry |

### User

All endpoints require JWT + verified email.

| Method | Endpoint | Description |
|---|---|---|
| `DELETE` | `/user` | Delete user account |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Database, memory, and disk health status |

## Database Schema

### User

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String | Unique, indexed |
| `password` | String | bcrypt hashed |
| `refreshToken` | String? | bcrypt hashed |
| `emailVerified` | Boolean | Default `false` |
| `verificationToken` | String? | JWT token |
| `resetToken` | String? | bcrypt hashed |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

### CalendarEntry

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | String | Max 255 chars |
| `startDate` | DateTime | Indexed |
| `endDate` | DateTime | Indexed |
| `content` | String? | Max 5000 chars |
| `wholeDay` | Boolean? | All-day event flag |
| `userId` | UUID | FK → User, indexed |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

## Database Seeding

Run `pnpm prisma:seed` to populate with test data. Use `--force` to skip the confirmation prompt.

| Email | Password | Verified |
|---|---|---|
| `alice@example.com` | `password123!` | Yes |
| `bob@example.com` | `password123!` | Yes |

The seed also creates 11 sample calendar entries distributed between both users.

## Docker

Multi-stage Dockerfile using Node 22 Alpine. Includes a healthcheck on `/health`. Exposes port 3000.

```bash
# Build from monorepo root
docker build -f apps/api/Dockerfile -t b-cal-api .

# Run
docker run -p 3000:3000 --env-file apps/api/.env b-cal-api
```

## License

UNLICENSED
