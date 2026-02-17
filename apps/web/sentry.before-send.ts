import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_KEYS =
  /^(email|password|token|refreshtoken|resettoken|verificationtoken|authorization|cookie|set-cookie|x-csrf-token|secret)$/i;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function scrubObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = "[Filtered]";
    } else if (typeof value === "string") {
      result[key] = value.replace(EMAIL_PATTERN, "[email]");
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = scrubObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function scrubUrl(url: string): string {
  return url.replace(
    /([?&])(token|email|password|secret)=([^&]*)/gi,
    "$1$2=[Filtered]",
  );
}

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  // Keep only user ID — strip email, IP, username
  if (event.user) {
    event.user = { id: event.user.id };
  }

  if (event.request) {
    // Remove cookies entirely (contain auth tokens)
    delete event.request.cookies;

    // Scrub sensitive headers
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_KEYS.test(key)) {
          event.request.headers[key] = "[Filtered]";
        }
      }
    }

    // Scrub sensitive fields from request body
    if (event.request.data && typeof event.request.data === "object") {
      event.request.data = scrubObject(
        event.request.data as Record<string, unknown>,
      );
    }

    // Scrub tokens from query string and URL
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubUrl(event.request.query_string);
    } else if (
      event.request.query_string &&
      !Array.isArray(event.request.query_string)
    ) {
      event.request.query_string = scrubObject(
        event.request.query_string,
      ) as Record<string, string>;
    }
    if (event.request.url) {
      event.request.url = scrubUrl(event.request.url);
    }
  }

  // Scrub email addresses leaked into exception messages
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) {
        ex.value = ex.value.replace(EMAIL_PATTERN, "[email]");
      }
    }
  }

  return event;
}
