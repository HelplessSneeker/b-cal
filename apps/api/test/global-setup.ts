import { execSync } from 'child_process';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), quiet: true });

export default async function globalSetup() {
  const { DB_USER, DB_PASSWORD, DB_PORT, DB_NAME } = process.env;

  console.log(`\nSetting up test database: ${DB_NAME}`);

  // Connect to postgres (default db) to create test database
  const client = new Client({
    user: DB_USER,
    password: DB_PASSWORD,
    host: 'localhost',
    port: Number(DB_PORT),
    database: 'postgres',
  });

  try {
    await client.connect();

    // Drop and recreate test database
    await client.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Created database: ${DB_NAME}`);
  } finally {
    await client.end();
  }

  // Run migrations on test database
  console.log('Running migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });

  // Seed test database
  console.log('Seeding test database...');
  execSync('npx tsx prisma/seed.ts --force', {
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('Test database ready.\n');
}
