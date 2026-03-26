'use client';

import { memo } from 'react';
import { Repeat } from 'lucide-react';
import { CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { getEventTopPosition, getEventHeight } from '@/lib/calendar/time-utils';
import { OVERLAP_GAP_PX, SLOT_HEIGHT } from '@/lib/calendar/calendar-constants';
import { getTimeFormatter } from '@/lib/calendar/formatter-cache';
import { cn } from '@/lib/utils/utils';

interface EntryBlockProps {
  entry: CalendarEntry;
  onClick: (entry: CalendarEntry) => void;
  left?: number;
  width?: number;
  compact?: boolean;
}

function formatTimeRange(start: Date, end: Date, timezone: string): string {
  const fmt = getTimeFormatter(timezone);
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export const EntryBlock = memo(function EntryBlock({
  entry,
  onClick,
  left,
  width,
  compact = false,
}: EntryBlockProps) {
  const { timezone } = useLocale();
  const getColorClasses = useEntryColor();
  const colors = getColorClasses(entry.calendarId);
  const top = getEventTopPosition(entry.startDate, timezone);
  const height = getEventHeight(entry.startDate, entry.endDate);
  const displayHeight = Math.max(height, SLOT_HEIGHT);
  const isShort = height < 40;
  const hasOverlapLayout = left !== undefined && width !== undefined;

  return (
    <button
      type="button"
      className={cn(
        'absolute cursor-pointer overflow-hidden rounded-md border-l-[3px] text-left transition-colors hover:z-10',
        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        colors.border,
        colors.bg,
        colors.bgHover,
        compact ? 'px-0.5 py-0.5' : 'px-2 py-1',
        !hasOverlapLayout && 'left-1 right-1',
        isShort && 'py-0',
      )}
      style={
        hasOverlapLayout
          ? {
              top,
              height: displayHeight,
              left: `calc(${left}% + ${OVERLAP_GAP_PX}px)`,
              width: `calc(${width}% - ${OVERLAP_GAP_PX * 2}px)`,
            }
          : { top, height: displayHeight }
      }
      onClick={() => onClick(entry)}
      aria-label={entry.title}
    >
      <p
        className={cn(
          'flex items-center gap-1 truncate font-medium',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {entry.isRecurring && <Repeat className="size-3 shrink-0" />}
        <span className="truncate">{entry.title}</span>
      </p>
      {!isShort && !compact && (
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeRange(entry.startDate, entry.endDate, timezone)}
        </p>
      )}
    </button>
  );
});
