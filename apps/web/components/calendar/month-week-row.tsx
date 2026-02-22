'use client';

import { useMemo } from 'react';
import { type CalendarEntry } from '@/lib/stores/calendarStore';
import {
  computeSpanningEntries,
  entryOverlapsDay,
  isSameDay,
} from '@/lib/calendar/spanning-utils';
import { DateCell } from '@/components/calendar/date-cell';
import { cn } from '@/lib/utils/utils';

interface MonthWeekRowProps {
  days: Date[];
  entries: CalendarEntry[];
  currentMonth: number;
  onCellClick: (date: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onMoreClick: (date: Date) => void;
}

const MAX_SPANNING_ROWS = 3;
const MAX_TOTAL_ENTRIES = 3;

export function MonthWeekRow({
  days,
  entries,
  currentMonth,
  onCellClick,
  onEntryClick,
  onMoreClick,
}: MonthWeekRowProps) {
  const today = useMemo(() => new Date(), []);

  const wholeDayEntries = useMemo(
    () => entries.filter((e) => e.wholeDay),
    [entries],
  );

  const timedEntries = useMemo(
    () => entries.filter((e) => !e.wholeDay),
    [entries],
  );

  const spanningEntries = useMemo(
    () => computeSpanningEntries(wholeDayEntries, days),
    [wholeDayEntries, days],
  );

  const visibleSpanningEntries = spanningEntries.filter(
    (se) => se.row < MAX_SPANNING_ROWS,
  );

  const totalSpanningRows =
    spanningEntries.length > 0
      ? Math.min(
          Math.max(...spanningEntries.map((se) => se.row)) + 1,
          MAX_SPANNING_ROWS,
        )
      : 0;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b"
      data-testid="month-week-row"
    >
      {/* Column borders */}
      <div
        className="pointer-events-none absolute inset-0 grid grid-cols-7"
        aria-hidden="true"
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'border-l',
              i === 6 && 'border-r',
              days[i].getMonth() !== currentMonth && 'bg-muted/50',
            )}
          />
        ))}
      </div>

      {/* Day numbers */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isDayToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'cursor-pointer p-1',
                !isCurrentMonth && 'text-muted-foreground',
              )}
              onClick={() => onCellClick(day)}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center text-sm',
                  isDayToday &&
                    'rounded-full bg-primary text-primary-foreground',
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spanning bars */}
      {visibleSpanningEntries.length > 0 && (
        <div
          className="grid grid-cols-7 gap-y-0.5"
          style={{ gridTemplateRows: `repeat(${totalSpanningRows}, 20px)` }}
        >
          {visibleSpanningEntries.map((se) => (
            <div
              key={se.entry.id}
              className={cn(
                'flex cursor-pointer items-center truncate bg-blue-500/20 px-1 text-xs font-medium transition-colors hover:bg-blue-500/30',
                !se.continuesBefore &&
                  'ml-0.5 rounded-l border-l-2 border-blue-500',
                !se.continuesAfter && 'mr-0.5 rounded-r',
              )}
              style={{
                gridColumn: `${se.startCol + 1} / span ${se.span}`,
                gridRow: se.row + 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEntryClick(se.entry);
              }}
            >
              {se.entry.title}
            </div>
          ))}
        </div>
      )}

      {/* Per-cell timed entries */}
      <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden">
        {days.map((day) => {
          const dayTimed = timedEntries.filter((e) => entryOverlapsDay(e, day));
          const daySpanningRowCount = new Set(
            visibleSpanningEntries
              .filter((se) => entryOverlapsDay(se.entry, day))
              .map((se) => se.row),
          ).size;
          const dayMaxTimedVisible = Math.max(
            MAX_TOTAL_ENTRIES - daySpanningRowCount,
            0,
          );
          const hiddenSpanningForDay = spanningEntries.filter(
            (se) =>
              se.row >= MAX_SPANNING_ROWS && entryOverlapsDay(se.entry, day),
          ).length;

          return (
            <DateCell
              key={day.toISOString()}
              date={day}
              entries={dayTimed}
              onCellClick={onCellClick}
              onEntryClick={onEntryClick}
              onMoreClick={onMoreClick}
              maxVisibleEntries={dayMaxTimedVisible}
              extraHiddenCount={hiddenSpanningForDay}
            />
          );
        })}
      </div>
    </div>
  );
}
