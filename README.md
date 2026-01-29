# b-cal

A REST API for a calendar application built with NestJS, TypeScript, Prisma, and PostgreSQL.

This project is my attempt to develop a backend API for a calendar application. Currently, only the database layer and user authentication are implemented. Calendar functionality is still in development.


## Related Repositories

- [Frontend](https://github.com/HelplessSneeker/b-cal-frontend)


## Tech Stack

- NestJS 11
- TypeScript
- Prisma 7 (PostgreSQL)
- Passport (Local + JWT authentication)
- Docker (for development database)

## Prerequisites

- Node.js
- npm
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
```

## Getting Started

### 1. Start the Development Database

The project uses PostgreSQL running in Docker for development:

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container with the credentials defined in your `.env` file.

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client and Run Migrations

```bash
npm prisma:generate
npm prisma:migrate
```

### 4. Start the Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile the project |
| `npm run start:dev` | Run in watch mode for development |
| `npm run start:prod` | Run in production mode |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Run Prettier formatting |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |
| `pnpm run risma:generate` | Generate prisma client |
| `npm run prisma:migrate` | Migrate the database |
| `npm run prisma:studio` | View the database with a tool from prisma |

## API Documentation

Swagger documentation is available at `/api` when the server is running.

## Current Features

- User registration and login
- JWT-based authentication with access and refresh tokens
- PostgreSQL database with Prisma ORM

## License

UNLICENSED
