import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MAIL_JOB_SEND, MailJobData } from './mail-job.types';

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@InjectQueue(MAIL_QUEUE_NAME) private mailQueue: Queue) {}

  async enqueueVerificationEmail(
    email: string,
    token: string,
    theme?: string,
    accentColor?: string,
  ) {
    const data: MailJobData = {
      type: 'verification',
      email,
      token,
      theme,
      accentColor,
    };
    await this.mailQueue.add(MAIL_JOB_SEND, data);
    this.logger.debug(`Enqueued verification email for ${email}`);
  }

  async enqueuePasswordResetEmail(
    email: string,
    token: string,
    theme?: string,
    accentColor?: string,
  ) {
    const data: MailJobData = {
      type: 'password-reset',
      email,
      token,
      theme,
      accentColor,
    };
    await this.mailQueue.add(MAIL_JOB_SEND, data);
    this.logger.debug(`Enqueued password reset email for ${email}`);
  }

  async enqueueReminderEmail(
    email: string,
    title: string,
    startDate: string,
    theme?: string,
    accentColor?: string,
  ) {
    const data: MailJobData = {
      type: 'reminder',
      email,
      title,
      startDate,
      theme,
      accentColor,
    };
    await this.mailQueue.add(MAIL_JOB_SEND, data);
    this.logger.debug(`Enqueued reminder email for ${email}`);
  }
}
