import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Send structured logs to Sentry
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],
});
