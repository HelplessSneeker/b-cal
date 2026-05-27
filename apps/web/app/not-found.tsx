import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPinOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations('common.notFound');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <MapPinOffIcon className="text-muted-foreground size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-display-lg">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
