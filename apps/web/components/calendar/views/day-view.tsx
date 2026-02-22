'use client';

import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { entryOverlapsDay } from '@/lib/calendar/spanning-utils';
import { DAY_VIEW_MAX_COLUMNS } from '@/lib/calendar/calendar-constants';
import { TimeGrid } from '@/components/calendar/time-grid';
import { DayColumn } from '@/components/calendar/day-column';
import { AllDaySection } from '@/components/calendar/all-day-section';

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DayView() {
  const { currentDate, entries, openEntryModal } = useCalendarStore();

  const dayEntries = entries.filter((entry) =>
    entryOverlapsDay(entry, currentDate),
  );

  const allDayEntries = dayEntries.filter((entry) => entry.wholeDay);
  const timedEntries = dayEntries.filter((entry) => !entry.wholeDay);

  const handleSlotClick = (time: Date) => {
    openEntryModal(undefined, time);
  };

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold capitalize">
          {formatDayHeader(currentDate)}
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
