'use client';

import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';
import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
} from '@/lib/calendar/date-utils';
import { useLocale } from '@/lib/hooks/useLocale';
import type { DateRange } from 'react-day-picker';

export function SidebarCalendar() {
  const { view, currentDate, setCurrentDate, entries } = useCalendarStore();
  const { weekStartDay } = useLocale();

  // Get unique dates that have entries
  const entryDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach((entry) => {
      const date = new Date(entry.startDate);
      dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    return Array.from(dates).map((key) => {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month, day);
    });
  }, [entries]);

  // Calculate the visual range based on current view
  const selectedRange = useMemo((): DateRange | undefined => {
    switch (view) {
      case CalendarView.Day:
        return { from: currentDate, to: currentDate };
      case CalendarView.Week:
        return {
          from: getStartOfWeek(currentDate, weekStartDay),
          to: getEndOfWeek(currentDate, weekStartDay),
        };
      case CalendarView.Month:
        return {
          from: getStartOfMonth(currentDate),
          to: getEndOfMonth(currentDate),
        };
    }
  }, [view, currentDate, weekStartDay]);

  // Handle date selection based on view
  const handleSelect = (_range: DateRange | undefined, selectedDay: Date) => {
    if (!selectedDay) return;

    switch (view) {
      case CalendarView.Day:
        setCurrentDate(selectedDay);
        break;
      case CalendarView.Week:
        setCurrentDate(getStartOfWeek(selectedDay, weekStartDay));
        break;
      case CalendarView.Month:
        setCurrentDate(getStartOfMonth(selectedDay));
        break;
    }
  };

  return (
    <Calendar
      mode="range"
      captionLayout="dropdown"
      weekStartsOn={weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6}
      selected={selectedRange}
      onSelect={handleSelect}
      month={currentDate}
      onMonthChange={setCurrentDate}
      modifiers={{
        hasEntry: entryDates,
      }}
      modifiersClassNames={{
        hasEntry: 'has-entry-indicator',
      }}
    />
  );
}
