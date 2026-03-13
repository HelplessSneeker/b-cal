import { useCallback } from 'react';
import { useCalendarsStore } from '@/lib/stores/calendarsStore';
import {
  getEntryColorClasses,
  type EntryColorClasses,
} from '@/lib/utils/calendar-colors';

export function useEntryColor(): (
  calendarId: string | null | undefined,
) => EntryColorClasses {
  const calendarsMap = useCalendarsStore((s) => s.calendarsMap);
  return useCallback(
    (calendarId: string | null | undefined) =>
      getEntryColorClasses(calendarId, calendarsMap),
    [calendarsMap],
  );
}
