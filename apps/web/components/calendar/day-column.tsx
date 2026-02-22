'use client';

import { useMemo } from 'react';
import { CalendarEntry } from '@/lib/stores/calendarStore';
import { DAY_VIEW_MAX_COLUMNS } from '@/lib/calendar/calendar-constants';
import { computeOverlapLayout } from '@/lib/calendar/overlap-utils';
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
}

export function DayColumn({
  date,
  entries,
  onSlotClick,
  onEntryClick,
  maxVisibleColumns = DAY_VIEW_MAX_COLUMNS,
}: DayColumnProps) {
  const slots = Array.from({ length: 48 }, (_, i) => {
    const slotTime = new Date(date);
    slotTime.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0);
    return slotTime;
  });

  const layout = useMemo(
    () => computeOverlapLayout(entries, maxVisibleColumns),
    [entries, maxVisibleColumns],
  );

  return (
    <div className="relative flex-1">
      {slots.map((time, i) => (
        <TimeSlot key={i} time={time} onClick={onSlotClick} />
      ))}
      {layout.visibleEvents.map((event) => (
        <EntryBlock
          key={event.entry.id}
          entry={event.entry}
          onClick={onEntryClick}
          left={event.left}
          width={event.width}
        />
      ))}
      {layout.overflowGroups.map((group, i) => (
        <OverflowPill key={i} group={group} onEntryClick={onEntryClick} />
      ))}
      <CurrentTimeIndicator date={date} />
    </div>
  );
}
