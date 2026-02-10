# @b-cal/api

A REST API for a calendar application built with NestJS, TypeScript, Prisma, and PostgreSQL.


## Tech Stack

- NestJS 11
- TypeScript
- Prisma 7 (PostgreSQL)
- Passport (Local + JWT authentication)
- Nodemailer (email verification and password reset)
- Docker (for development database)

## Prerequisites

- Node.js
- pnpm
- Docker and Docker Compose

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
# App setup
PORT=3000
FRONTEND_URL="http://localhost:8080/"

# Database
DB_USER=root
DB_PASSWORD=root
DB_NAME=b_cal
DB_PORT=5432

# JWT Strategy
SECRET_KEY="your-secret-key"
REFRESH_SECRET_KEY="your-refresh-secret-key"

# Mail
MAIL_SECRET="your-mail-secret"
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=user@example.com
MAIL_PASS=password
MAIL_FROM="b-cal <noreply@b-cal.dev>"
```

In development, mail configuration (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS) is optional — the app automatically creates Ethereal test accounts and logs preview URLs to the console.

For e2e tests, create a `.env.test` file with a separate database name:

```
DB_NAME=b_cal_test
```

(Copy the rest of the variables from `.env`)

## Database Seeding

Run `pnpm run prisma:seed` to populate the database with test data. The seed script will prompt for confirmation before resetting the database (use `--force` to skip).

Test users created by the seed script (password for all: `password123!`):
- `alice@example.com` (email verified)
- `bob@example.com` (email verified)

## Getting Started

### 1. Start the Development Database

The project uses PostgreSQL running in Docker for development:

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container with the credentials defined in your `.env` file.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Generate Prisma Client and Run Migrations

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
```

### 4. Start the Development Server

```bash
pnpm run dev
```

The API will be available at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile the project |
| `pnpm run dev` | Run in watch mode for development |
| `pnpm run start:prod` | Run in production mode |
| `pnpm run lint` | Run ESLint with auto-fix |
| `pnpm run format` | Run Prettier formatting |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run end-to-end tests (uses separate test database) |
| `pnpm run test:cov` | Run tests with coverage |
| `pnpm run prisma:generate` | Generate Prisma client |
| `pnpm run prisma:migrate` | Migrate the database |
| `pnpm run prisma:seed` | Seed database with test data |
| `pnpm run prisma:studio` | View the database with Prisma Studio |

## API Documentation

Swagger documentation is available at `/api` when the server is running.

## Features

- User registration and login
- JWT-based authentication with access and refresh tokens (httpOnly cookies)
- Email verification on signup (JWT token, 1 day expiry)
- Password reset via email (JWT token, 1 hour expiry)
- Calendar entries with CRUD operations
- Date range filtering for calendar queries
- PostgreSQL database with Prisma ORM

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | - | Register a new user, sends verification email |
| `POST` | `/auth/login` | - | Login with email and password |
| `POST` | `/auth/refresh` | Refresh token | Refresh access and refresh tokens |
| `POST` | `/auth/logout` | JWT | Logout and invalidate refresh token |
| `GET` | `/auth/me` | JWT | Get current user (id, email, emailVerified) |
| `POST` | `/auth/resend-verification` | JWT | Resend email verification link |
| `GET` | `/auth/verify-email?token=` | - | Verify email address |
| `POST` | `/auth/forgot-password` | - | Request password reset email |
| `POST` | `/auth/reset-password` | - | Reset password with token |

### Calendar

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/calendar` | JWT | Create a calendar entry |
| `GET` | `/calendar` | JWT | List entries (optional startDate/endDate filters) |
| `GET` | `/calendar/:id` | JWT | Get a single entry |
| `PATCH` | `/calendar/:id` | JWT | Update an entry |
| `DELETE` | `/calendar/:id` | JWT | Delete an entry |

## Database Schema

### User
- `id` (UUID, primary key)
- `email` (unique)
- `password` (bcrypt hashed)
- `refreshToken` (bcrypt hashed, nullable)
- `emailVerified` (boolean, default false)
- `verificationToken` (nullable)
- `resetToken` (nullable)

### CalendarEntry
- `id` (UUID, primary key)
- `title`
- `startDate`, `endDate`
- `content` (nullable)
- `wholeDay` (nullable)
- `userId` (foreign key to User)

## Run Docker container (from mono repo root)

```bash
# Build the Image
docker build -f apps/api/Dockerfile -t b-cal-api .

# Run Container
docker run --name b-cal-api -p 3000:3000 --network=host --env-file apps/api/.env b-cal-api

```

## License

UNLICENSED
