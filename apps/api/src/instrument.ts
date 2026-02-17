import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { beforeSend } from './sentry-before-send';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Send structured logs to Sentry
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],

  // Scrub PII (emails, tokens, cookies) before sending to Sentry
  beforeSend,
});
