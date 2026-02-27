'use client';

import {
  HOUR_HEIGHT,
  START_HOUR,
  END_HOUR,
  TIME_COLUMN_WIDTH,
} from '@/lib/calendar/calendar-constants';
import { formatHour } from '@/lib/calendar/time-utils';

interface TimeColumnProps {
  columnWidth?: number;
}

export function TimeColumn({
  columnWidth = TIME_COLUMN_WIDTH,
}: TimeColumnProps) {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i,
  );

  const compact = columnWidth < TIME_COLUMN_WIDTH;

  return (
    <div
      className="shrink-0 flex flex-col text-xs text-muted-foreground"
      style={{ width: columnWidth }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="flex items-center justify-end pr-1"
          style={{ height: HOUR_HEIGHT }}
        >
          {compact ? hour.toString() : formatHour(hour)}
        </div>
      ))}
    </div>
  );
}
