'use client';

import { useCallback, useMemo, useRef } from 'react';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useVisibleEntries } from '@/lib/hooks/useVisibleEntries';
import { TimeGrid } from '@/components/calendar/time-grid';
import { DayColumn } from '@/components/calendar/day-column';
import { WeekAllDayRow } from '@/components/calendar/week-all-day-row';
import { getStartOfWeek, getWeekNumber } from '@/lib/calendar/date-utils';
import { isSameDay, entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import {
  TIME_COLUMN_WIDTH,
  MOBILE_TIME_COLUMN_WIDTH,
  WEEK_VIEW_MAX_COLUMNS,
  MIN_ENTRY_COLUMN_WIDTH,
} from '@/lib/calendar/calendar-constants';
import { useDynamicColumns } from '@/lib/hooks/useDynamicColumns';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useTranslations } from 'next-intl';

function getWeekDays(startOfWeek: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });
}

function formatDayHeader(
  date: Date,
  locale: string,
): { weekday: string; dayNumber: string } {
  const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
  const dayNumber = date.getDate().toString();
  return { weekday, dayNumber };
}

function isToday(date: Date): boolean {
  const today = new Date();
  return isSameDay(date, today);
}

export function WeekView({ date }: { date?: Date }) {
  const t = useTranslations('calendar');
  const storeDate = useCalendarStore((s) => s.currentDate);
  const entries = useVisibleEntries();
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);
  const { language, weekStartDay } = useLocale();
  const currentDate = date ?? storeDate;
  const isMobile = useMediaQuery('(max-width: 767px)');

  const timeColumnWidth = isMobile
    ? MOBILE_TIME_COLUMN_WIDTH
    : TIME_COLUMN_WIDTH;

  const startOfWeek = useMemo(
    () => getStartOfWeek(currentDate, weekStartDay),
    [currentDate, weekStartDay],
  );
  const weekDays = useMemo(() => getWeekDays(startOfWeek), [startOfWeek]);

  const allDayEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        entry.wholeDay && weekDays.some((day) => entryOverlapsDay(entry, day)),
    );
  }, [entries, weekDays]);

  const timedEntriesPerDay = useMemo(
    () =>
      weekDays.map((day) =>
        entries.filter(
          (entry) => !entry.wholeDay && entryOverlapsDay(entry, day),
        ),
      ),
    [entries, weekDays],
  );

  const handleSlotClick = useCallback(
    (time: Date) => {
      openEntryModal(undefined, time);
    },
    [openEntryModal],
  );

  const handleEntryClick = useCallback(
    (entry: CalendarEntry) => {
      openEntryModal(entry);
    },
    [openEntryModal],
  );

  const columnRef = useRef<HTMLDivElement>(null);
  const dynamicColumns = useDynamicColumns(columnRef, MIN_ENTRY_COLUMN_WIDTH);
  const effectiveMaxColumns = dynamicColumns ?? WEEK_VIEW_MAX_COLUMNS;

  const weekLabel = t('calendarWeekShort', {
    week: getWeekNumber(currentDate),
  });

  return (
    <div className="flex h-full flex-col" role="region" aria-label={weekLabel}>
      {/* Week header with day names and dates */}
      <div className="flex border-b pr-2.5">
        {/* Empty space for time column alignment */}
        <div className="shrink-0" style={{ width: timeColumnWidth }} />
        {/* Day headers */}
        <div className="flex flex-1">
          {weekDays.map((day) => {
            const { weekday, dayNumber } = formatDayHeader(day, language);
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
            {weekDays.map((day, i) => (
              <div
                key={day.toISOString()}
                ref={i === 0 ? columnRef : undefined}
                className="flex-1 border-l"
              >
                <DayColumn
                  date={day}
                  entries={timedEntriesPerDay[i]}
                  onSlotClick={handleSlotClick}
                  onEntryClick={handleEntryClick}
                  maxVisibleColumns={effectiveMaxColumns}
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
