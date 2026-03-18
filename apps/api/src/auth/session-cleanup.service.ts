import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly sessionService: SessionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiredSessions() {
    try {
      const result = await this.sessionService.deleteExpiredSessions();
      this.logger.log(`Deleted ${result.count} expired sessions`);
    } catch (error) {
      this.logger.error('Failed to delete expired sessions', error);
    }
  }
}
