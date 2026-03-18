import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MailJobData } from './mail-job.types';
import { MailService } from './mail.service';

@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private mailService: MailService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    this.logger.log(`Processing mail job ${job.id} (type: ${job.data.type})`);

    try {
      switch (job.data.type) {
        case 'verification':
          await this.mailService.sendVerificationEmail(
            job.data.email,
            job.data.token,
          );
          break;
        case 'password-reset':
          await this.mailService.sendPasswordResetEmail(
            job.data.email,
            job.data.token,
          );
          break;
        case 'reminder':
          await this.mailService.sendReminderEmail(
            job.data.email,
            job.data.title,
            job.data.startDate,
          );
          break;
      }

      this.logger.log(`Mail job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Mail job ${job.id} failed (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1}): ${error}`,
      );
      throw error;
    }
  }
}
