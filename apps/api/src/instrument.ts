import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: '***REDACTED***',

  // Send structured logs to Sentry
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
