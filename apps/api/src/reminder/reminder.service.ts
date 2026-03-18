import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { expandRecurringEntry } from 'src/calendar/utils/expand-recurrence';
import { ReminderUnit } from 'src/calendar/enums/reminder-unit.enum';
import {
  REMINDER_QUEUE_NAME,
  REMINDER_JOB_POLL,
  REMINDER_JOB_SEND,
} from './reminder.constants';
import type { ReminderJobData } from './reminder-job.types';

const POLL_SCHEDULER_ID = 'reminder-poll-scheduler';

@Injectable()
export class ReminderService implements OnModuleInit {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectQueue(REMINDER_QUEUE_NAME) private reminderQueue: Queue,
    private prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    // Clean up legacy repeatable jobs from the old add()+repeat pattern
    const repeatableJobs = await this.reminderQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.reminderQueue.removeRepeatableByKey(job.key);
    }

    // Drain any stuck failed jobs from previous runs
    const failedJobs = await this.reminderQueue.getFailed();
    for (const job of failedJobs) {
      await job.remove();
    }
    if (failedJobs.length > 0) {
      this.logger.log(
        `Cleaned up ${failedJobs.length} failed reminder jobs from previous runs`,
      );
    }

    // upsertJobScheduler is the BullMQ 5.x way to create a single
    // repeatable schedule — it deduplicates by scheduler ID, so
    // restarts never create extra poll jobs.
    await this.reminderQueue.upsertJobScheduler(
      POLL_SCHEDULER_ID,
      { every: 60_000 },
      {
        name: REMINDER_JOB_POLL,
        data: { type: 'poll' } satisfies ReminderJobData,
      },
    );
    this.logger.log('Registered reminder poll scheduler (every 60s)');
  }

  async findAndEnqueueDueReminders() {
    const now = new Date();
    // Look back 1 day to catch any missed reminders
    const lookbackMs = 24 * 60 * 60 * 1000;

    // 0) Clean up old ReminderSent records (> 7 days) — they've served
    //    their idempotency purpose and no longer need to stay around
    const cleanupCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count: cleaned } = await this.prismaService.reminderSent.deleteMany(
      {
        where: { sentAt: { lt: cleanupCutoff } },
      },
    );
    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old ReminderSent records`);
    }

    // 1) Non-recurring entries with reminders
    const nonRecurring = await this.prismaService.calendarEntry.findMany({
      where: {
        reminderType: { not: null },
        recurrenceFrequency: null,
        startDate: { gt: new Date(now.getTime() - lookbackMs) },
      },
      include: { user: { select: { email: true } }, remindersSent: true },
    });

    for (const entry of nonRecurring) {
      const fireTime = this.computeFireTime(
        entry.startDate,
        entry.reminderAmount!,
        entry.reminderUnit! as ReminderUnit,
      );

      if (fireTime > now) continue;

      const alreadySent = entry.remindersSent.some(
        (rs) => rs.occurrenceDate.getTime() === entry.startDate.getTime(),
      );
      if (alreadySent) continue;

      await this.enqueueSend({
        calendarEntryId: entry.id,
        occurrenceDate: entry.startDate.toISOString(),
        userId: entry.userId,
        email: entry.user.email,
        title: entry.title,
        startDate: entry.startDate.toISOString(),
      });
    }

    // 2) Recurring entries with reminders
    const recurring = await this.prismaService.calendarEntry.findMany({
      where: {
        reminderType: { not: null },
        recurrenceFrequency: { not: null },
      },
      include: {
        user: { select: { email: true } },
        recurrenceExceptions: true,
        remindersSent: true,
      },
    });

    // Window: from now - lookback to now + max reminder offset (7 days)
    const maxOffsetMs = 7 * 24 * 60 * 60 * 1000;
    const windowStart = new Date(now.getTime() - lookbackMs);
    const windowEnd = new Date(now.getTime() + maxOffsetMs);

    for (const entry of recurring) {
      const occurrences = expandRecurringEntry(
        entry as typeof entry & { recurrenceFrequency: string },
        entry.recurrenceExceptions,
        windowStart,
        windowEnd,
      );

      const sentDates = new Set(
        entry.remindersSent.map((rs) => rs.occurrenceDate.toISOString()),
      );

      for (const occurrence of occurrences) {
        const fireTime = this.computeFireTime(
          occurrence.startDate,
          entry.reminderAmount!,
          entry.reminderUnit! as ReminderUnit,
        );

        if (fireTime > now) continue;

        const occDateKey = occurrence.originalDate.toISOString();
        if (sentDates.has(occDateKey)) continue;

        await this.enqueueSend({
          calendarEntryId: entry.id,
          occurrenceDate: occDateKey,
          userId: entry.userId,
          email: entry.user.email,
          title: occurrence.title,
          startDate: occurrence.startDate.toISOString(),
        });
      }
    }
  }

  private computeFireTime(
    startDate: Date,
    amount: number,
    unit: ReminderUnit,
  ): Date {
    let offsetMs: number;
    switch (unit) {
      case ReminderUnit.MINUTES:
        offsetMs = amount * 60 * 1000;
        break;
      case ReminderUnit.HOURS:
        offsetMs = amount * 60 * 60 * 1000;
        break;
      case ReminderUnit.DAYS:
        offsetMs = amount * 24 * 60 * 60 * 1000;
        break;
      default:
        offsetMs = 0;
    }
    return new Date(startDate.getTime() - offsetMs);
  }

  private async enqueueSend(data: {
    calendarEntryId: string;
    occurrenceDate: string;
    userId: string;
    email: string;
    title: string;
    startDate: string;
  }) {
    const jobData: ReminderJobData = { type: 'send', ...data };
    // No deterministic jobId — the ReminderSent unique constraint
    // is the real idempotency guard. A fixed jobId can block re-adds
    // if a previous job failed and sits in the "failed" state.
    await this.reminderQueue.add(REMINDER_JOB_SEND, jobData);
    this.logger.log(
      `Enqueued reminder send for "${data.title}" (entry ${data.calendarEntryId}) to ${data.email}`,
    );
  }
}
