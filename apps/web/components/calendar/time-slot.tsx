'use client';

import { memo } from 'react';
import { SLOT_HEIGHT } from '@/lib/calendar/calendar-constants';
import { getTimeInTimezone } from '@/lib/calendar/time-utils';
import { cn } from '@/lib/utils/utils';

interface TimeSlotProps {
  time: Date;
  timezone: string;
  onClick: (time: Date) => void;
}

export const TimeSlot = memo(function TimeSlot({
  time,
  timezone,
  onClick,
}: TimeSlotProps) {
  const isHourBoundary = getTimeInTimezone(time, timezone).minutes === 30;

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className={cn(
        'w-full cursor-pointer border-b transition-colors hover:bg-muted/50',
        isHourBoundary ? 'border-border' : 'border-border/30',
      )}
      style={{ height: SLOT_HEIGHT }}
      onClick={() => onClick(time)}
    ></button>
  );
});
