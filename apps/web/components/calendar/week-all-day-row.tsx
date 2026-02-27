'use client';

import { useMemo } from 'react';
import { CalendarEntry } from '@/lib/stores/calendarStore';
import { TIME_COLUMN_WIDTH } from '@/lib/calendar/calendar-constants';
import { computeSpanningEntries } from '@/lib/calendar/spanning-utils';
import { cn } from '@/lib/utils/utils';

interface WeekAllDayRowProps {
  weekDays: Date[];
  allDayEntries: CalendarEntry[];
  onEntryClick: (entry: CalendarEntry) => void;
  timeColumnWidth?: number;
}

export function WeekAllDayRow({
  weekDays,
  allDayEntries,
  onEntryClick,
  timeColumnWidth = TIME_COLUMN_WIDTH,
}: WeekAllDayRowProps) {
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
          {spanningEntries.map((se) => (
            <div
              key={se.entry.id}
              className={cn(
                'flex cursor-pointer items-center truncate bg-blue-500/20 text-xs font-medium transition-colors hover:bg-blue-500/30',
                timeColumnWidth >= TIME_COLUMN_WIDTH ? 'px-2' : 'px-0.5',
                !se.continuesBefore &&
                  'rounded-l-md border-l-[3px] border-blue-500',
                !se.continuesAfter && 'rounded-r-md',
              )}
              style={{
                gridColumn: `${se.startCol + 1} / span ${se.span}`,
                gridRow: se.row + 1,
              }}
              onClick={() => onEntryClick(se.entry)}
            >
              {se.entry.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
