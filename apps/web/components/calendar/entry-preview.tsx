'use client';

import { Repeat } from 'lucide-react';
import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
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
  const getColorClasses = useEntryColor();
  const colors = getColorClasses(entry.calendarId);
  return (
    <div
      className={cn(
        'cursor-pointer truncate rounded px-1 py-0.5 text-xs transition-colors',
        'border-l-2',
        colors.border,
        colors.bg,
        colors.bgHover,
      )}
      onClick={onClick}
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
          <span className="ml-1 font-medium">{entry.title}</span>
        </>
      )}
    </div>
  );
}
