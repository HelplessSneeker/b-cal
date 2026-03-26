'use client';

import { memo, useMemo } from 'react';
import { CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { DAY_VIEW_MAX_COLUMNS } from '@/lib/calendar/calendar-constants';
import { computeOverlapLayout } from '@/lib/calendar/overlap-utils';
import { createSlotTime } from '@/lib/calendar/time-utils';
import { TimeSlot } from '@/components/calendar/time-slot';
import { EntryBlock } from '@/components/calendar/entry-block';
import { OverflowPill } from '@/components/calendar/overflow-pill';
import { CurrentTimeIndicator } from '@/components/calendar/current-time-indicator';

interface DayColumnProps {
  date: Date;
  entries: CalendarEntry[];
  onSlotClick: (time: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  maxVisibleColumns?: number;
  compact?: boolean;
}

export const DayColumn = memo(function DayColumn({
  date,
  entries,
  onSlotClick,
  onEntryClick,
  maxVisibleColumns = DAY_VIEW_MAX_COLUMNS,
  compact = false,
}: DayColumnProps) {
  const { timezone } = useLocale();

  const slots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) =>
        createSlotTime(date, Math.floor(i / 2), (i % 2) * 30, timezone),
      ),
    [date, timezone],
  );

  const layout = useMemo(
    () => computeOverlapLayout(entries, maxVisibleColumns),
    [entries, maxVisibleColumns],
  );

  return (
    <div className="relative flex flex-1 flex-col">
      {slots.map((time, i) => (
        <TimeSlot
          key={i}
          time={time}
          timezone={timezone}
          onClick={onSlotClick}
        />
      ))}
      {layout.visibleEvents.map((event) => (
        <EntryBlock
          key={event.entry.id}
          entry={event.entry}
          onClick={onEntryClick}
          left={event.left}
          width={event.width}
          compact={compact}
        />
      ))}
      {layout.overflowGroups.map((group, i) => (
        <OverflowPill key={i} group={group} onEntryClick={onEntryClick} />
      ))}
      <CurrentTimeIndicator date={date} />
    </div>
  );
});
