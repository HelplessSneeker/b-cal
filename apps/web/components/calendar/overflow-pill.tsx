'use client';

import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { type OverflowGroup } from '@/lib/calendar/overlap-utils';
import { OVERLAP_GAP_PX } from '@/lib/calendar/calendar-constants';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

interface OverflowPillProps {
  group: OverflowGroup;
  onEntryClick: (entry: CalendarEntry) => void;
}

function formatTimeRange(start: Date, end: Date): string {
  const format = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return `${format(start)} - ${format(end)}`;
}

export function OverflowPill({ group, onEntryClick }: OverflowPillProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="absolute z-[5] cursor-pointer overflow-hidden rounded-md border border-dashed border-blue-400 bg-blue-500/10 px-1 py-0.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/20"
          style={{
            top: group.topPx,
            height: group.heightPx,
            left: `calc(${group.left}% + ${OVERLAP_GAP_PX}px)`,
            width: `calc(${group.width}% - ${OVERLAP_GAP_PX * 2}px)`,
          }}
        >
          +{group.hiddenCount} weitere
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-64 w-64 overflow-y-auto p-2">
        <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
          {group.hiddenCount} weitere Einträge
        </p>
        <ul className="space-y-1">
          {group.hiddenEntries.map((entry) => (
            <li key={entry.id}>
              <button
                className="w-full cursor-pointer rounded-md border-l-[3px] border-blue-500 bg-blue-500/10 px-2 py-1 text-left transition-colors hover:bg-blue-500/20"
                onClick={() => onEntryClick(entry)}
              >
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTimeRange(entry.startDate, entry.endDate)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
