'use client';

import { useEffect, useState } from 'react';
import { getEventTopPosition } from '@/lib/calendar/time-utils';
import { useLocale } from '@/lib/hooks/useLocale';

interface CurrentTimeIndicatorProps {
  date: Date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CurrentTimeIndicator({ date }: CurrentTimeIndicatorProps) {
  const { timezone } = useLocale();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!isSameDay(date, now)) {
    return null;
  }

  const top = getEventTopPosition(now, timezone);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
      style={{ top }}
    >
      <div className="h-3 w-3 -translate-x-1/2 rounded-full bg-destructive" />
      <div className="h-0.5 flex-1 bg-destructive" />
    </div>
  );
}
