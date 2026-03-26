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
      className="shrink-0 relative text-xs text-muted-foreground"
      style={{
        width: columnWidth,
        height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
      }}
    >
      {hours
        .filter((hour) => hour > START_HOUR)
        .map((hour) => (
          <span
            key={hour}
            className="absolute right-1"
            style={{ top: hour * HOUR_HEIGHT, transform: 'translateY(-50%)' }}
          >
            {compact ? hour.toString() : formatHour(hour)}
          </span>
        ))}
    </div>
  );
}
