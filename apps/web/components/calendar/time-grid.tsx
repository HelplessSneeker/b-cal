'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimeColumn } from '@/components/calendar/time-column';
import { HOUR_HEIGHT } from '@/lib/calendar/calendar-constants';

interface TimeGridProps {
  children: ReactNode;
  timeColumnWidth?: number;
}

export function TimeGrid({ children, timeColumnWidth }: TimeGridProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      const scrollTo8am = 8 * HOUR_HEIGHT;
      viewportRef.current.scrollTop = scrollTo8am;
    }
  }, []);

  return (
    <ScrollArea className="h-full" viewportRef={viewportRef}>
      <div className="flex min-w-full pr-2.5">
        <TimeColumn columnWidth={timeColumnWidth} />
        {children}
      </div>
    </ScrollArea>
  );
}
