import { useMemo } from 'react';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import {
  useCalendarsStore,
  DEFAULT_CALENDAR_ID,
} from '@/lib/stores/calendarsStore';

export function useVisibleEntries(): CalendarEntry[] {
  const entries = useCalendarStore((s) => s.entries);
  const hiddenCalendarIds = useCalendarsStore((s) => s.hiddenCalendarIds);

  return useMemo(
    () =>
      entries.filter((entry) => {
        if (!entry.calendarId) {
          return !hiddenCalendarIds.has(DEFAULT_CALENDAR_ID);
        }
        return !hiddenCalendarIds.has(entry.calendarId);
      }),
    [entries, hiddenCalendarIds],
  );
}
