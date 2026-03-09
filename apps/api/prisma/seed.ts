import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env['DB_HOST'] ?? 'localhost'}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public`,
  }),
});

/**
 * Creates a date relative to today at a specific time.
 * @param daysOffset - Number of days from today (0 = today, 1 = tomorrow, -1 = yesterday)
 * @param hours - Hour of the day (0-23)
 * @param minutes - Minutes (0-59)
 */
function getRelativeDate(daysOffset: number, hours = 0, minutes = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Creates a date at the start of the day (00:00:00) for whole day events.
 */
function getWholeDayDate(daysOffset: number): Date {
  return getRelativeDate(daysOffset, 0, 0);
}

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
  if (process.env.NODE_ENV === 'production') {
    console.error('Seeding is not allowed in production.');
    process.exit(1);
  }

  const confirmed = await confirmSeed();
  if (!confirmed) {
    console.log('Seed cancelled.');
    return;
  }

  console.log('Seeding database...');

  // Clear existing data
  await prisma.session.deleteMany();
  await prisma.userPreferences.deleteMany();
  await prisma.calendarEntry.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const hashedPassword = await bcrypt.hash('password123!', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: hashedPassword,
      emailVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: hashedPassword,
      emailVerified: true,
    },
  });

  // Create user preferences
  await prisma.userPreferences.create({
    data: {
      userId: user1.id,
      language: 'en-US',
      timezone: 'America/New_York',
      theme: 'system',
      accentColor: 'blue',
      weekStart: 'monday',
    },
  });
  await prisma.userPreferences.create({
    data: {
      userId: user2.id,
      language: 'de-DE',
      timezone: 'Europe/Berlin',
      theme: 'dark',
      accentColor: 'indigo',
      weekStart: 'monday',
    },
  });

  console.log(`Created users: ${user1.email}, ${user2.email}`);

  // Create calendar entries
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const entries = await Promise.all([
    prisma.calendarEntry.create({
      data: {
        title: 'Team Meeting',
        startDate: new Date(now.setHours(10, 0, 0, 0)),
        endDate: new Date(now.setHours(11, 0, 0, 0)),
        content: 'Weekly team sync',
        userId: user1.id,
      },
    }),
    prisma.calendarEntry.create({
      data: {
        title: 'Lunch with Client',
        startDate: new Date(tomorrow.setHours(12, 0, 0, 0)),
        endDate: new Date(tomorrow.setHours(13, 30, 0, 0)),
        content: 'Discuss Q2 roadmap',
        userId: user1.id,
      },
    }),
    prisma.calendarEntry.create({
      data: {
        title: 'Project Deadline',
        startDate: new Date(nextWeek.setHours(9, 0, 0, 0)),
        endDate: new Date(nextWeek.setHours(17, 0, 0, 0)),
        content: 'Final submission for Phase 1',
        userId: user2.id,
      },
    }),
  ]);

  // Create dynamic entries relative to current date
  const dynamicEntries = await Promise.all([
    // Today - regular timed event
    prisma.calendarEntry.create({
      data: {
        title: 'Morning Standup',
        startDate: getRelativeDate(0, 9, 0),
        endDate: getRelativeDate(0, 9, 30),
        content: 'Daily standup meeting',
        userId: user1.id,
      },
    }),
    // Today - whole day event
    prisma.calendarEntry.create({
      data: {
        title: 'Focus Day',
        startDate: getWholeDayDate(0),
        endDate: getWholeDayDate(0),
        content: 'No meetings - deep work only',
        wholeDay: true,
        userId: user2.id,
      },
    }),
    // Tomorrow - regular event
    prisma.calendarEntry.create({
      data: {
        title: 'Code Review Session',
        startDate: getRelativeDate(1, 14, 0),
        endDate: getRelativeDate(1, 15, 30),
        content: 'Review PR #42',
        userId: user1.id,
      },
    }),
    // Multi-day event (3 days starting tomorrow)
    prisma.calendarEntry.create({
      data: {
        title: 'Team Offsite',
        startDate: getWholeDayDate(1),
        endDate: getWholeDayDate(3),
        content: 'Annual team building retreat',
        wholeDay: true,
        userId: user1.id,
      },
    }),
    // Next week - whole day event
    prisma.calendarEntry.create({
      data: {
        title: 'Company Holiday',
        startDate: getWholeDayDate(7),
        endDate: getWholeDayDate(7),
        wholeDay: true,
        userId: user2.id,
      },
    }),
    // Multi-day event spanning 5 days (starting in 10 days)
    prisma.calendarEntry.create({
      data: {
        title: 'Conference Week',
        startDate: getWholeDayDate(10),
        endDate: getWholeDayDate(14),
        content: 'Tech conference with workshops',
        wholeDay: true,
        userId: user1.id,
      },
    }),
    // Future regular event (2 weeks out)
    prisma.calendarEntry.create({
      data: {
        title: 'Quarterly Review',
        startDate: getRelativeDate(14, 10, 0),
        endDate: getRelativeDate(14, 12, 0),
        content: 'Q1 performance review',
        userId: user2.id,
      },
    }),
    // Future event (3 weeks out)
    prisma.calendarEntry.create({
      data: {
        title: 'Product Launch',
        startDate: getRelativeDate(21, 9, 0),
        endDate: getRelativeDate(21, 18, 0),
        content: 'v2.0 release day',
        userId: user1.id,
      },
    }),
  ]);

  console.log(
    `Created ${entries.length + dynamicEntries.length} calendar entries`,
  );
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
