export interface Env {
  NEXT_PUBLIC_BACKEND_URL: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  // Public base URL of the web app itself. Used for absolute social-share
  // (Open Graph / Twitter) image and canonical URLs. Optional in dev.
  NEXT_PUBLIC_SITE_URL?: string;
}

let validated = false;
let env: Env;

export function validateEnv(): Env {
  if (validated) return env;

  const errors: string[] = [];

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    errors.push('NEXT_PUBLIC_BACKEND_URL is required');
  } else {
    try {
      new URL(backendUrl);
    } catch {
      errors.push(
        `NEXT_PUBLIC_BACKEND_URL must be a valid URL (got "${backendUrl}")`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }

  env = {
    NEXT_PUBLIC_BACKEND_URL: backendUrl!,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  };

  validated = true;
  return env;
}
