'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  useCalendarStore,
  CalendarView,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { getMonthGridDates } from '@/lib/calendar/date-utils';
import { entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import { MonthWeekRow } from '@/components/calendar/month-week-row';
import { useLocale } from '@/lib/hooks/useLocale';
import { cn } from '@/lib/utils/utils';

// All weekday keys in JS day order (0=Sun … 6=Sat)
const ALL_WEEKDAY_KEYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const;

function getOrderedWeekdayKeys(weekStartDay: number) {
  return Array.from(
    { length: 7 },
    (_, i) => ALL_WEEKDAY_KEYS[(weekStartDay + i) % 7],
  );
}

export function MonthView({ date }: { date?: Date }) {
  const t = useTranslations('calendar.weekdays');
  const storeDate = useCalendarStore((s) => s.currentDate);
  const entries = useCalendarStore((s) => s.entries);
  const setView = useCalendarStore((s) => s.setView);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);
  const { weekStartDay } = useLocale();
  const currentDate = date ?? storeDate;

  const weekdayKeys = useMemo(
    () => getOrderedWeekdayKeys(weekStartDay),
    [weekStartDay],
  );
  const gridDates = getMonthGridDates(currentDate, weekStartDay);
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
      <div className="grid grid-cols-7 border-y">
        {weekdayKeys.map((key, index) => (
          <div
            key={key}
            className={cn(
              'border-l py-2 text-center text-xs font-medium uppercase text-muted-foreground',
              index === 6 && 'border-r',
            )}
          >
            {t(key)}
          </div>
        ))}
      </div>

      {/* Month grid - 6 week rows */}
      <div className="flex flex-1 flex-col border-b [&>:last-child]:pb-2">
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
