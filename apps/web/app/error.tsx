'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common.genericError');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-feedback-warning/30 bg-card p-8 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-feedback-warning/15">
          <AlertTriangleIcon className="size-6 text-feedback-warning" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            {error.digest}
          </p>
        )}
        <Button onClick={reset}>{t('tryAgain')}</Button>
      </div>
    </div>
  );
}
