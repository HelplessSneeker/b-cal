'use client';

import { useMemo } from 'react';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { TimeGrid } from '@/components/calendar/time-grid';
import { DayColumn } from '@/components/calendar/day-column';
import { WeekAllDayRow } from '@/components/calendar/week-all-day-row';
import { getStartOfWeek } from '@/lib/calendar/date-utils';
import { isSameDay, entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import {
  TIME_COLUMN_WIDTH,
  MOBILE_TIME_COLUMN_WIDTH,
  WEEK_VIEW_MAX_COLUMNS,
} from '@/lib/calendar/calendar-constants';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

function getWeekDays(startOfWeek: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });
}

function formatDayHeader(date: Date): { weekday: string; dayNumber: string } {
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
  const dayNumber = date.getDate().toString();
  return { weekday, dayNumber };
}

function isToday(date: Date): boolean {
  const today = new Date();
  return isSameDay(date, today);
}

export function WeekView({ date }: { date?: Date }) {
  const storeDate = useCalendarStore((s) => s.currentDate);
  const entries = useCalendarStore((s) => s.entries);
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);
  const currentDate = date ?? storeDate;
  const isMobile = useMediaQuery('(max-width: 767px)');

  const timeColumnWidth = isMobile
    ? MOBILE_TIME_COLUMN_WIDTH
    : TIME_COLUMN_WIDTH;

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = getWeekDays(startOfWeek);

  const allDayEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        entry.wholeDay && weekDays.some((day) => entryOverlapsDay(entry, day)),
    );
  }, [entries, weekDays]);

  const getTimedEntriesForDay = (day: Date): CalendarEntry[] => {
    return entries.filter(
      (entry) => !entry.wholeDay && entryOverlapsDay(entry, day),
    );
  };

  const handleSlotClick = (time: Date) => {
    openEntryModal(undefined, time);
  };

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Week header with day names and dates */}
      <div className="flex border-b pr-2.5">
        {/* Empty space for time column alignment */}
        <div className="shrink-0" style={{ width: timeColumnWidth }} />
        {/* Day headers */}
        <div className="flex flex-1">
          {weekDays.map((day) => {
            const { weekday, dayNumber } = formatDayHeader(day);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className="flex flex-1 flex-col items-center border-l py-2"
              >
                <span className="text-xs uppercase text-muted-foreground">
                  {weekday}
                </span>
                <span
                  className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    today ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {dayNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* All-day entries row */}
      <WeekAllDayRow
        weekDays={weekDays}
        allDayEntries={allDayEntries}
        onEntryClick={handleEntryClick}
        timeColumnWidth={timeColumnWidth}
      />
      {/* Time grid with day columns */}
      <div className="flex-1 overflow-hidden">
        <TimeGrid timeColumnWidth={timeColumnWidth}>
          <div className="flex flex-1">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="flex-1 border-l">
                <DayColumn
                  date={day}
                  entries={getTimedEntriesForDay(day)}
                  onSlotClick={handleSlotClick}
                  onEntryClick={handleEntryClick}
                  maxVisibleColumns={WEEK_VIEW_MAX_COLUMNS}
                  compact={isMobile}
                />
              </div>
            ))}
          </div>
        </TimeGrid>
      </div>
    </div>
  );
}
