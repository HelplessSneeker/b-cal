import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public`,
  }),
});

async function confirmSeed(): Promise<boolean> {
  // Skip confirmation if --force flag is passed
  if (process.argv.includes('--force')) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\nWarning: This will reset the database "${process.env.DB_NAME}" and insert seed data.\nContinue? (y/N): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      },
    );
  });
}

async function main() {
  const confirmed = await confirmSeed();
  if (!confirmed) {
    console.log('Seed cancelled.');
    return;
  }

  console.log('Seeding database...');

  // Clear existing data
  await prisma.calenderEntry.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const hashedPassword = await bcrypt.hash('password123!', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: hashedPassword,
    },
  });

  console.log(`Created users: ${user1.email}, ${user2.email}`);

  // Create calendar entries
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const entries = await Promise.all([
    prisma.calenderEntry.create({
      data: {
        title: 'Team Meeting',
        startDate: new Date(now.setHours(10, 0, 0, 0)),
        endDate: new Date(now.setHours(11, 0, 0, 0)),
        content: 'Weekly team sync',
        userId: user1.id,
      },
    }),
    prisma.calenderEntry.create({
      data: {
        title: 'Lunch with Client',
        startDate: new Date(tomorrow.setHours(12, 0, 0, 0)),
        endDate: new Date(tomorrow.setHours(13, 30, 0, 0)),
        content: 'Discuss Q2 roadmap',
        userId: user1.id,
      },
    }),
    prisma.calenderEntry.create({
      data: {
        title: 'Project Deadline',
        startDate: new Date(nextWeek.setHours(9, 0, 0, 0)),
        endDate: new Date(nextWeek.setHours(17, 0, 0, 0)),
        content: 'Final submission for Phase 1',
        userId: user2.id,
      },
    }),
  ]);

  console.log(`Created ${entries.length} calendar entries`);
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
