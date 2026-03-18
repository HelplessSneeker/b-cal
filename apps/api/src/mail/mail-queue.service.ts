import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MAIL_JOB_SEND, MailJobData } from './mail-job.types';

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@InjectQueue(MAIL_QUEUE_NAME) private mailQueue: Queue) {}

  async enqueueVerificationEmail(email: string, token: string) {
    const data: MailJobData = { type: 'verification', email, token };
    await this.mailQueue.add(MAIL_JOB_SEND, data);
    this.logger.debug(`Enqueued verification email for ${email}`);
  }

  async enqueuePasswordResetEmail(email: string, token: string) {
    const data: MailJobData = { type: 'password-reset', email, token };
    await this.mailQueue.add(MAIL_JOB_SEND, data);
    this.logger.debug(`Enqueued password reset email for ${email}`);
  }
}
