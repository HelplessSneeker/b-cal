'use client';

import { CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { getEventTopPosition, getEventHeight } from '@/lib/calendar/time-utils';
import { OVERLAP_GAP_PX } from '@/lib/calendar/calendar-constants';
import { cn } from '@/lib/utils/utils';

interface EntryBlockProps {
  entry: CalendarEntry;
  onClick: (entry: CalendarEntry) => void;
  left?: number;
  width?: number;
  compact?: boolean;
}

function formatTimeRange(start: Date, end: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export function EntryBlock({
  entry,
  onClick,
  left,
  width,
  compact = false,
}: EntryBlockProps) {
  const { timezone } = useLocale();
  const top = getEventTopPosition(entry.startDate, timezone);
  const height = getEventHeight(entry.startDate, entry.endDate);
  const isShort = height < 40;
  const hasOverlapLayout = left !== undefined && width !== undefined;

  return (
    <div
      className={cn(
        'absolute cursor-pointer overflow-hidden rounded-md border-l-[3px] border-blue-500 bg-blue-500/20 transition-colors hover:z-10 hover:bg-blue-500/30',
        compact ? 'px-0.5 py-0.5' : 'px-2 py-1',
        !hasOverlapLayout && 'left-1 right-1',
        isShort && 'py-0',
      )}
      style={
        hasOverlapLayout
          ? {
              top,
              height,
              left: `calc(${left}% + ${OVERLAP_GAP_PX}px)`,
              width: `calc(${width}% - ${OVERLAP_GAP_PX * 2}px)`,
            }
          : { top, height }
      }
      onClick={() => onClick(entry)}
    >
      <p
        className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}
      >
        {entry.title}
      </p>
      {!isShort && !compact && (
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeRange(entry.startDate, entry.endDate, timezone)}
        </p>
      )}
    </div>
  );
}
