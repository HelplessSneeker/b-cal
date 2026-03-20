import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailQueueService } from 'src/mail/mail-queue.service';
import { UserService } from 'src/user/user.service';
import { REMINDER_QUEUE_NAME } from './reminder.constants';
import { ReminderJobData } from './reminder-job.types';
import { ReminderService } from './reminder.service';

@Processor(REMINDER_QUEUE_NAME)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private reminderService: ReminderService,
    private prismaService: PrismaService,
    private mailQueueService: MailQueueService,
    private userService: UserService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    switch (job.data.type) {
      case 'poll':
        this.logger.debug('Running reminder poll');
        await this.reminderService.findAndEnqueueDueReminders();
        break;

      case 'send': {
        const {
          calendarEntryId,
          occurrenceDate,
          userId,
          email,
          title,
          startDate,
        } = job.data;

        // Idempotency: create ReminderSent record (unique constraint prevents duplicates)
        try {
          await this.prismaService.reminderSent.create({
            data: {
              calendarEntryId,
              occurrenceDate: new Date(occurrenceDate),
            },
          });
        } catch (error: unknown) {
          // If unique constraint violation, reminder was already sent
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002'
          ) {
            this.logger.debug(
              `Reminder already sent for ${calendarEntryId}:${occurrenceDate}, skipping`,
            );
            return;
          }
          throw error;
        }

        const prefs = await this.userService.findPreferences(userId);
        await this.mailQueueService.enqueueReminderEmail(
          email,
          title,
          startDate,
          prefs?.theme,
          prefs?.accentColor,
        );
        this.logger.log(
          `Reminder sent for entry ${calendarEntryId} to ${email}`,
        );
        break;
      }
    }
  }
}
