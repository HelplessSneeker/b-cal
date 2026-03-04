'use client';

import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { isEffectiveWholeDay } from '@/lib/calendar/spanning-utils';
import { cn } from '@/lib/utils/utils';

interface EntryPreviewProps {
  entry: CalendarEntry;
  onClick: (e: React.MouseEvent) => void;
}

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function EntryPreview({ entry, onClick }: EntryPreviewProps) {
  const { timezone } = useLocale();
  return (
    <div
      className={cn(
        'cursor-pointer truncate rounded px-1 py-0.5 text-xs transition-colors',
        'border-l-2 border-blue-500 bg-blue-500/20 hover:bg-blue-500/30',
      )}
      onClick={onClick}
    >
      {isEffectiveWholeDay(entry) ? (
        <span className="font-medium">{entry.title}</span>
      ) : (
        <>
          <span className="text-muted-foreground">
            {formatTime(entry.startDate, timezone)}
          </span>
          <span className="ml-1 font-medium">{entry.title}</span>
        </>
      )}
    </div>
  );
}
