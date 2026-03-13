'use client';

import { CalendarEntry } from '@/lib/stores/calendarStore';
import { getDaySpanInfo } from '@/lib/calendar/spanning-utils';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { cn } from '@/lib/utils/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AllDaySectionProps {
  entries: CalendarEntry[];
  currentDay: Date;
  onEntryClick: (entry: CalendarEntry) => void;
}

export function AllDaySection({
  entries,
  currentDay,
  onEntryClick,
}: AllDaySectionProps) {
  const getColorClasses = useEntryColor();

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="border-b px-4 py-2">
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => {
          const { continuesBefore, continuesAfter } = getDaySpanInfo(
            entry,
            currentDay,
          );
          const colors = getColorClasses(entry.calendarId);
          return (
            <div
              key={entry.id}
              className={cn(
                'flex cursor-pointer items-center gap-1 px-3 py-1 transition-colors',
                colors.bg,
                colors.bgHover,
                !continuesBefore &&
                  `rounded-l-md border-l-[3px] ${colors.border}`,
                !continuesAfter && 'rounded-r-md',
                continuesBefore && !continuesAfter && 'rounded-l-none',
                continuesAfter && !continuesBefore && 'rounded-r-none',
              )}
              onClick={() => onEntryClick(entry)}
            >
              {continuesBefore && (
                <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">{entry.title}</p>
              {continuesAfter && (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
