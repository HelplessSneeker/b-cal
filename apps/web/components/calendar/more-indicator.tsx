'use client';

import { useTranslations } from 'next-intl';

interface MoreIndicatorProps {
  count: number;
  onClick: (e: React.MouseEvent) => void;
}

export function MoreIndicator({ count, onClick }: MoreIndicatorProps) {
  const t = useTranslations('calendar');

  return (
    <button
      type="button"
      className="mt-auto cursor-pointer text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      onClick={onClick}
    >
      {t('more', { count })}
    </button>
  );
}
