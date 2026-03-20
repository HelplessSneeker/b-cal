import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from 'src/mail/mail.module';
import { UserModule } from 'src/user/user.module';
import { ReminderService } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { REMINDER_QUEUE_NAME } from './reminder.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: REMINDER_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    MailModule,
    UserModule,
  ],
  providers: [ReminderService, ReminderProcessor],
})
export class ReminderModule {}
