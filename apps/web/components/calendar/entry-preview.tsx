'use client';

import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { isEffectiveWholeDay } from '@/lib/calendar/spanning-utils';
import { getTimeFormatter } from '@/lib/calendar/formatter-cache';
import { cn } from '@/lib/utils/utils';

interface EntryPreviewProps {
  entry: CalendarEntry;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function formatTime(date: Date, timezone: string): string {
  return getTimeFormatter(timezone).format(date);
}

export const EntryPreview = memo(function EntryPreview({
  entry,
  onClick,
}: EntryPreviewProps) {
  const { timezone } = useLocale();
  const getColorClasses = useEntryColor();
  const colors = getColorClasses(entry.calendarId);
  return (
    <button
      type="button"
      className={cn(
        'block w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-xs transition-colors',
        'border-l-2',
        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        colors.border,
        colors.bg,
        colors.bgHover,
      )}
      onClick={onClick}
      aria-label={entry.title}
    >
      {isEffectiveWholeDay(entry) ? (
        <span className="flex items-center gap-1 font-medium">
          {entry.isRecurring && <Repeat className="size-3 shrink-0" />}
          <span className="truncate">{entry.title}</span>
        </span>
      ) : (
        <>
          <span className="text-muted-foreground">
            {formatTime(entry.startDate, timezone)}
          </span>
          {entry.isRecurring && (
            <Repeat className="ml-1 inline size-3 align-text-bottom" />
          )}
          <span className="ml-1 truncate font-medium">{entry.title}</span>
        </>
      )}
    </button>
  );
});
