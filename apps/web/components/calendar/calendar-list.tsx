'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  useCalendarsStore,
  DEFAULT_CALENDAR_ID,
} from '@/lib/stores/calendarsStore';
import { getCalendars } from '@/lib/api/calendars';
import {
  DEFAULT_ENTRY_COLORS,
  getColorClasses,
} from '@/lib/utils/calendar-colors';
import { CalendarManageDialog } from '@/components/calendar/calendar-manage-dialog';
import { cn } from '@/lib/utils/utils';

export function CalendarList() {
  const t = useTranslations('calendar.calendars');
  const {
    calendars,
    hiddenCalendarIds,
    toggleVisibility,
    setCalendars,
    isLoaded,
  } = useCalendarsStore();
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    getCalendars()
      .then(setCalendars)
      .catch(() => {
        // Error toast shown by api()
      });
  }, [isLoaded, setCalendars]);

  const isDefaultHidden = hiddenCalendarIds.has(DEFAULT_CALENDAR_ID);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('title')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setManageOpen(true)}
          aria-label={t('manage')}
        >
          <Settings2 className="size-3.5" />
        </Button>
      </div>
      <div className="mt-1 space-y-0.5">
        {/* Default calendar */}
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent">
          <Checkbox
            checked={!isDefaultHidden}
            onCheckedChange={() => toggleVisibility(DEFAULT_CALENDAR_ID)}
            className={cn(
              'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            )}
          />
          <span
            className={cn(
              'size-2.5 shrink-0 rounded-full',
              DEFAULT_ENTRY_COLORS.dot,
            )}
          />
          <span className="truncate text-sm">{t('default')}</span>
        </label>

        {/* User calendars */}
        {calendars.map((cal) => {
          const isHidden = hiddenCalendarIds.has(cal.id);
          const colors = getColorClasses(cal.color);
          return (
            <label
              key={cal.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"
            >
              <Checkbox
                checked={!isHidden}
                onCheckedChange={() => toggleVisibility(cal.id)}
                className={cn(
                  colors.dot.replace('bg-', 'data-[state=checked]:border-'),
                  colors.dot.replace('bg-', 'data-[state=checked]:bg-'),
                )}
              />
              <span
                className={cn('size-2.5 shrink-0 rounded-full', colors.dot)}
              />
              <span className="truncate text-sm">{cal.name}</span>
            </label>
          );
        })}
      </div>

      <CalendarManageDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
