import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { CalendarModule } from './calendar/calendar.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ validate }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                ignore: 'req,res', // Hide req/res in dev for cleaner logs
              },
            }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    CalendarModule,
    PrismaModule,
    AuthModule,
    UserModule,
    MailModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
