'use client';

import { useMemo } from 'react';
import {
  useCalendarStore,
  CalendarView,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { getMonthGridDates } from '@/lib/calendar/date-utils';
import { entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import { MonthWeekRow } from '@/components/calendar/month-week-row';
import { cn } from '@/lib/utils/utils';

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function MonthView() {
  const { currentDate, entries, setView, setCurrentDate, openEntryModal } =
    useCalendarStore();

  const gridDates = getMonthGridDates(currentDate);
  const currentMonth = currentDate.getMonth();

  const weekRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(gridDates.slice(i * 7, (i + 1) * 7));
    }
    return rows;
  }, [gridDates]);

  const getEntriesForWeek = (weekDays: Date[]): CalendarEntry[] => {
    return entries.filter((entry) =>
      weekDays.some((day) => entryOverlapsDay(entry, day)),
    );
  };

  const handleMoreClick = (date: Date) => {
    setCurrentDate(date);
    setView(CalendarView.Day);
  };

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry);
  };

  const handleCellClick = (date: Date) => {
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    openEntryModal(undefined, startTime);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_NAMES.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-xs font-medium uppercase text-muted-foreground',
              index > 0 && 'border-l',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid - 6 week rows */}
      <div className="flex flex-1 flex-col">
        {weekRows.map((weekDays) => (
          <MonthWeekRow
            key={weekDays[0].toISOString()}
            days={weekDays}
            entries={getEntriesForWeek(weekDays)}
            currentMonth={currentMonth}
            onCellClick={handleCellClick}
            onEntryClick={handleEntryClick}
            onMoreClick={handleMoreClick}
          />
        ))}
      </div>
    </div>
  );
}
