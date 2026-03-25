'use client';

import { useCallback, useMemo } from 'react';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useVisibleEntries } from '@/lib/hooks/useVisibleEntries';
import { entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import { DAY_VIEW_MAX_COLUMNS } from '@/lib/calendar/calendar-constants';
import { TimeGrid } from '@/components/calendar/time-grid';
import { DayColumn } from '@/components/calendar/day-column';
import { AllDaySection } from '@/components/calendar/all-day-section';

function formatDayHeader(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DayView({ date }: { date?: Date }) {
  const storeDate = useCalendarStore((s) => s.currentDate);
  const entries = useVisibleEntries();
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);
  const { language } = useLocale();
  const currentDate = date ?? storeDate;

  const dayEntries = useMemo(
    () => entries.filter((entry) => entryOverlapsDay(entry, currentDate)),
    [entries, currentDate],
  );
  const allDayEntries = useMemo(
    () => dayEntries.filter((entry) => entry.wholeDay),
    [dayEntries],
  );
  const timedEntries = useMemo(
    () => dayEntries.filter((entry) => !entry.wholeDay),
    [dayEntries],
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold capitalize">
          {formatDayHeader(currentDate, language)}
        </h2>
      </div>
      <AllDaySection
        entries={allDayEntries}
        currentDay={currentDate}
        onEntryClick={handleEntryClick}
      />
      <div className="flex-1 overflow-hidden">
        <TimeGrid>
          <DayColumn
            date={currentDate}
            entries={timedEntries}
            onSlotClick={handleSlotClick}
            onEntryClick={handleEntryClick}
            maxVisibleColumns={DAY_VIEW_MAX_COLUMNS}
          />
        </TimeGrid>
      </div>
    </div>
  );
}
