'use client';

import { useTranslations } from 'next-intl';
import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { useEntryColor } from '@/lib/hooks/useEntryColor';
import { type OverflowGroup } from '@/lib/calendar/overlap-utils';
import { OVERLAP_GAP_PX } from '@/lib/calendar/calendar-constants';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { getTimeFormatter } from '@/lib/calendar/formatter-cache';
import { cn } from '@/lib/utils/utils';

interface OverflowPillProps {
  group: OverflowGroup;
  onEntryClick: (entry: CalendarEntry) => void;
}

function formatTimeRange(start: Date, end: Date, timezone: string): string {
  const fmt = getTimeFormatter(timezone);
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export function OverflowPill({ group, onEntryClick }: OverflowPillProps) {
  const t = useTranslations('calendar');
  const { timezone } = useLocale();
  const getColorClasses = useEntryColor();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('moreEntriesLabel', { count: group.hiddenCount })}
          className="absolute z-[5] cursor-pointer overflow-hidden rounded-md border border-dashed border-muted-foreground/50 bg-muted px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
          style={{
            top: group.topPx,
            height: group.heightPx,
            left: `calc(${group.left}% + ${OVERLAP_GAP_PX}px)`,
            width: `calc(${group.width}% - ${OVERLAP_GAP_PX * 2}px)`,
          }}
        >
          {t('more', { count: group.hiddenCount })}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-64 w-64 overflow-y-auto p-2">
        <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
          {t('moreEntries', { count: group.hiddenCount })}
        </p>
        <ul className="space-y-1">
          {group.hiddenEntries.map((entry) => {
            const colors = getColorClasses(entry.calendarId);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full cursor-pointer rounded-md border-l-[3px] px-2 py-1 text-left transition-colors',
                    colors.border,
                    colors.bg,
                    colors.bgHover,
                  )}
                  onClick={() => onEntryClick(entry)}
                >
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTimeRange(entry.startDate, entry.endDate, timezone)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
