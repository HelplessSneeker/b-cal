'use client';

import { useMemo } from 'react';
import { type CalendarEntry } from '@/lib/stores/calendarStore';
import {
  computeSpanningEntries,
  entryOverlapsDay,
  isEffectiveWholeDay,
  isSameDay,
} from '@/lib/calendar/spanning-utils';
import { EntryPreview } from '@/components/calendar/entry-preview';
import { MoreIndicator } from '@/components/calendar/more-indicator';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { cn } from '@/lib/utils/utils';

interface MonthWeekRowProps {
  days: Date[];
  entries: CalendarEntry[];
  currentMonth: number;
  onCellClick: (date: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onMoreClick: (date: Date) => void;
}

const MAX_ENTRIES_PER_DAY = 3;

export function MonthWeekRow({
  days,
  entries,
  currentMonth,
  onCellClick,
  onEntryClick,
  onMoreClick,
}: MonthWeekRowProps) {
  const getColorClasses = useEntryColor();
  const today = useMemo(() => new Date(), []);

  const wholeDayEntries = useMemo(
    () => entries.filter(isEffectiveWholeDay),
    [entries],
  );

  const timedEntries = useMemo(
    () => entries.filter((e) => !isEffectiveWholeDay(e)),
    [entries],
  );

  const spanningEntries = useMemo(
    () => computeSpanningEntries(wholeDayEntries, days),
    [wholeDayEntries, days],
  );

  const visibleSpanningEntries = spanningEntries.filter(
    (se) => se.row < MAX_ENTRIES_PER_DAY,
  );

  const hasEntries = entries.length > 0;

  // Per-day: compute which rows are free and how many timed entries to show
  const dayData = useMemo(() => {
    return days.map((day, colIdx) => {
      const occupiedRows = new Set(
        visibleSpanningEntries
          .filter((se) => entryOverlapsDay(se.entry, day))
          .map((se) => se.row),
      );

      const freeRows: number[] = [];
      for (let r = 0; r < MAX_ENTRIES_PER_DAY; r++) {
        if (!occupiedRows.has(r)) freeRows.push(r);
      }

      const dayTimed = timedEntries.filter((e) => entryOverlapsDay(e, day));

      const hiddenSpanning = spanningEntries.filter(
        (se) =>
          se.row >= MAX_ENTRIES_PER_DAY && entryOverlapsDay(se.entry, day),
      ).length;

      const timedToShow = Math.min(dayTimed.length, freeRows.length);
      const hiddenCount = dayTimed.length - timedToShow + hiddenSpanning;

      return { day, colIdx, dayTimed, freeRows, timedToShow, hiddenCount };
    });
  }, [days, visibleSpanningEntries, spanningEntries, timedEntries]);

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

      {/* Unified entries grid: spanning bars + timed entries share rows */}
      {hasEntries && (
        <div
          className="grid grid-cols-7 gap-y-0.5"
          style={{
            gridTemplateRows: `repeat(${MAX_ENTRIES_PER_DAY}, 20px)`,
          }}
        >
          {/* Spanning (multi-day) entries */}
          {visibleSpanningEntries.map((se) => {
            const colors = getColorClasses(se.entry.calendarId);
            return (
              <div
                key={se.entry.id}
                className={cn(
                  'flex min-w-0 cursor-pointer items-center overflow-hidden px-1 text-xs font-medium transition-colors',
                  colors.bg,
                  colors.bgHover,
                  !se.continuesBefore &&
                    `ml-0.5 rounded-l border-l-2 ${colors.border}`,
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
                <span className="truncate">{se.entry.title}</span>
              </div>
            );
          })}

          {/* Timed entries placed in free row slots per day */}
          {dayData.flatMap(({ dayTimed, freeRows, timedToShow, colIdx }) =>
            dayTimed.slice(0, timedToShow).map((entry, i) => (
              <div
                key={entry.id}
                className="px-0.5"
                style={{
                  gridColumn: colIdx + 1,
                  gridRow: freeRows[i] + 1,
                }}
              >
                <EntryPreview
                  entry={entry}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEntryClick(entry);
                  }}
                />
              </div>
            )),
          )}
        </div>
      )}

      {/* "+N more" indicators */}
      <div className="grid grid-cols-7">
        {dayData.map(({ day, hiddenCount }) =>
          hiddenCount > 0 ? (
            <div key={day.toISOString()} className="px-0.5">
              <MoreIndicator
                count={hiddenCount}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreClick(day);
                }}
              />
            </div>
          ) : (
            <div key={day.toISOString()} />
          ),
        )}
      </div>
    </div>
  );
}
