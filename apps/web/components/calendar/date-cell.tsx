'use client';

import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { EntryPreview } from '@/components/calendar/entry-preview';
import { MoreIndicator } from '@/components/calendar/more-indicator';
import { cn } from '@/lib/utils/utils';

interface DateCellProps {
  date: Date;
  entries: CalendarEntry[];
  isCurrentMonth: boolean;
  onCellClick: (date: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onMoreClick: (date: Date) => void;
  maxVisibleEntries?: number;
  extraHiddenCount?: number;
}

export function DateCell({
  date,
  entries,
  isCurrentMonth,
  onCellClick,
  onEntryClick,
  onMoreClick,
  maxVisibleEntries = 3,
  extraHiddenCount = 0,
}: DateCellProps) {
  const visibleEntries = entries.slice(0, maxVisibleEntries);
  const hiddenCount =
    Math.max(entries.length - maxVisibleEntries, 0) + extraHiddenCount;

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 overflow-hidden px-0.5',
        !isCurrentMonth && 'bg-muted/50',
      )}
      onClick={() => onCellClick(date)}
    >
      {visibleEntries.map((entry) => (
        <EntryPreview
          key={entry.id}
          entry={entry}
          onClick={(e) => {
            e.stopPropagation();
            onEntryClick(entry);
          }}
        />
      ))}

      {hiddenCount > 0 && (
        <MoreIndicator
          count={hiddenCount}
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick(date);
          }}
        />
      )}
    </div>
  );
}
