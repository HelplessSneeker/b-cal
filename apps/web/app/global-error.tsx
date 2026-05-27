'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

const STRINGS = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try again',
  },
  de: {
    title: 'Etwas ist schiefgelaufen',
    description:
      'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.',
    tryAgain: 'Erneut versuchen',
  },
} as const;

function detectLang(): 'en' | 'de' {
  if (typeof document === 'undefined') return 'en';
  const cookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('NEXT_LOCALE='));
  if (cookie?.includes('de')) return 'de';
  return 'en';
}

export default function GlobalError({
  reset,
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const lang = detectLang();
  const t = STRINGS[lang];

  return (
    <html lang={lang}>
      <body className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-feedback-warning/30 bg-card p-8 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-feedback-warning/15">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-feedback-warning"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-display-md">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs outline-none transition-all hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {t.tryAgain}
          </button>
        </div>
      </body>
    </html>
  );
}
