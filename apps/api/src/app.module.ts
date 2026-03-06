import { randomUUID } from 'crypto';
import * as path from 'path';
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
import {
  reqSerializer,
  resSerializer,
} from './common/logging/pino-serializers';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { defaultLocale } from '@b-cal/i18n/config';

const REQUEST_ID_HEADER = 'X-Request-Id';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ validate }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        genReqId: (req, res) => {
          const id =
            req.headers[REQUEST_ID_HEADER.toLowerCase()] ?? randomUUID();
          res.setHeader(REQUEST_ID_HEADER, id);
          return id;
        },
        serializers: {
          req: reqSerializer,
          res: resSerializer,
        },
        redact: {
          paths: [
            'password',
            'token',
            'refreshToken',
            'resetToken',
            'verificationToken',
            'email',
            'secret',
          ],
          censor: '[Redacted]',
        },
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
    I18nModule.forRoot({
      fallbackLanguage: defaultLocale,
      loaderOptions: {
        path: path.join(
          path.dirname(require.resolve('@b-cal/i18n/locales/en/error.json')),
          '..',
        ),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [AcceptLanguageResolver],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
        {
          name: 'mail',
          ttl: 300000,
          limit: 300,
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
export class AppModule {}
