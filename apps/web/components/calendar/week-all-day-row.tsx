'use client';

import { memo, useMemo } from 'react';
import { CalendarEntry } from '@/lib/stores/calendarStore';
import { TIME_COLUMN_WIDTH } from '@/lib/calendar/calendar-constants';
import { computeSpanningEntries } from '@/lib/calendar/spanning-utils';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { cn } from '@/lib/utils/utils';

interface WeekAllDayRowProps {
  weekDays: Date[];
  allDayEntries: CalendarEntry[];
  onEntryClick: (entry: CalendarEntry) => void;
  timeColumnWidth?: number;
}

export const WeekAllDayRow = memo(function WeekAllDayRow({
  weekDays,
  allDayEntries,
  onEntryClick,
  timeColumnWidth = TIME_COLUMN_WIDTH,
}: WeekAllDayRowProps) {
  const getColorClasses = useEntryColor();
  const spanningEntries = useMemo(
    () => computeSpanningEntries(allDayEntries, weekDays),
    [allDayEntries, weekDays],
  );

  if (spanningEntries.length === 0) {
    return null;
  }

  const totalRows = Math.max(...spanningEntries.map((se) => se.row)) + 1;

  return (
    <div className="flex border-b pr-2.5">
      <div
        className="flex shrink-0 items-center justify-end pr-1 text-xs text-muted-foreground"
        style={{ width: timeColumnWidth }}
      >
        {timeColumnWidth >= TIME_COLUMN_WIDTH ? 'all-day' : ''}
      </div>
      <div className="relative flex-1">
        {/* Column borders */}
        <div
          className="pointer-events-none absolute inset-0 grid grid-cols-7"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="border-l" />
          ))}
        </div>
        {/* Spanning bars */}
        <div
          className="grid grid-cols-7 gap-y-1 p-1"
          style={{ gridTemplateRows: `repeat(${totalRows}, 24px)` }}
        >
          {spanningEntries.map((se) => {
            const colors = getColorClasses(se.entry.calendarId);
            return (
              <button
                type="button"
                key={se.entry.id}
                className={cn(
                  'flex min-w-0 cursor-pointer items-center overflow-hidden text-left text-xs font-medium transition-colors',
                  'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  colors.bg,
                  colors.bgHover,
                  timeColumnWidth >= TIME_COLUMN_WIDTH ? 'px-2' : 'px-0.5',
                  !se.continuesBefore &&
                    `rounded-l-md border-l-[3px] ${colors.border}`,
                  !se.continuesAfter && 'rounded-r-md',
                )}
                style={{
                  gridColumn: `${se.startCol + 1} / span ${se.span}`,
                  gridRow: se.row + 1,
                }}
                onClick={() => onEntryClick(se.entry)}
                aria-label={se.entry.title}
              >
                <span className="truncate">{se.entry.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
