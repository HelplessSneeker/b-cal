'use client';

import { useCallback, useMemo, useRef } from 'react';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useVisibleEntries } from '@/lib/hooks/useVisibleEntries';
import { entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import {
  DAY_VIEW_MAX_COLUMNS,
  MIN_ENTRY_COLUMN_WIDTH,
} from '@/lib/calendar/calendar-constants';
import { useDynamicColumns } from '@/lib/hooks/useDynamicColumns';
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

  const columnRef = useRef<HTMLDivElement>(null);
  const dynamicColumns = useDynamicColumns(columnRef, MIN_ENTRY_COLUMN_WIDTH);
  const effectiveMaxColumns = dynamicColumns ?? DAY_VIEW_MAX_COLUMNS;

  return (
    <div
      className="flex h-full flex-col"
      role="region"
      aria-label={formatDayHeader(currentDate, language)}
    >
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
          <div ref={columnRef} className="flex flex-1">
            <DayColumn
              date={currentDate}
              entries={timedEntries}
              onSlotClick={handleSlotClick}
              onEntryClick={handleEntryClick}
              maxVisibleColumns={effectiveMaxColumns}
            />
          </div>
        </TimeGrid>
      </div>
    </div>
  );
}
