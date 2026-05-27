'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOffIcon } from 'lucide-react';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
const HEALTH_CHECK_INTERVAL_MS = 10_000;

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function ConnectionGuard() {
  const t = useTranslations('common.serviceUnavailable');
  const tCommon = useTranslations('common');
  const { isBackendDown, isRetrying, recordSuccess, setRetrying } =
    useConnectionStore();
  const wasDown = useRef(false);

  useEffect(() => {
    if (!isBackendDown) {
      if (wasDown.current) {
        wasDown.current = false;
        window.location.reload();
      }
      return;
    }

    wasDown.current = true;

    const interval = setInterval(async () => {
      const healthy = await checkHealth();
      if (healthy) {
        recordSuccess();
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isBackendDown, recordSuccess]);

  if (!isBackendDown) return null;

  const handleRetry = async () => {
    setRetrying(true);
    const [healthy] = await Promise.all([
      checkHealth(),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
    if (healthy) {
      recordSuccess();
    } else {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-feedback-info/30 bg-card p-8 text-center shadow-lg">
        <div className="flex size-12 items-center justify-center rounded-full bg-feedback-info/15">
          <WifiOffIcon className="size-6 text-feedback-info" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? <Spinner /> : tCommon('retry')}
        </Button>
      </div>
    </div>
  );
}
