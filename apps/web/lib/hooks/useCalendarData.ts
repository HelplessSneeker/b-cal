import { useEffect, useRef } from 'react';
import { useCalendarStore, isRangeCovered } from '@/lib/stores/calendarStore';
import { getMonthGridDates } from '@/lib/calendar/date-utils';
import { getEntries } from '@/lib/api/calendar';

function getFetchWindow(currentDate: Date): { start: Date; end: Date } {
  const prevMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1,
  );
  const nextMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    1,
  );

  const prevGrid = getMonthGridDates(prevMonth);
  const nextGrid = getMonthGridDates(nextMonth);

  return {
    start: prevGrid[0],
    end: nextGrid[nextGrid.length - 1],
  };
}

export function useCalendarData() {
  const view = useCalendarStore((s) => s.view);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const cacheVersion = useCalendarStore((s) => s.cacheVersion);
  const inFlightRef = useRef(new Set<string>());

  useEffect(() => {
    const { start, end } = getFetchWindow(currentDate);
    const startTs = start.getTime();
    const endTs = end.getTime();

    const { loadedRanges } = useCalendarStore.getState();
    if (isRangeCovered(loadedRanges, startTs, endTs)) return;

    const key = `${startTs}-${endTs}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);

    const { setIsFetching, mergeEntries, replaceEntries, addLoadedRange } =
      useCalendarStore.getState();
    // After invalidation (cacheVersion > 0), replace all entries to remove
    // stale synthetic IDs from deleted/modified recurring occurrences.
    const isRefresh = cacheVersion > 0 && loadedRanges.length === 0;
    setIsFetching(true);

    getEntries(start, end)
      .then((entries) => {
        if (isRefresh) {
          replaceEntries(entries);
        } else {
          mergeEntries(entries);
        }
        addLoadedRange(startTs, endTs);
      })
      .catch(() => {
        // Error toast already shown by api()
      })
      .finally(() => {
        setIsFetching(false);
        inFlightRef.current.delete(key);
      });
  }, [view, currentDate, cacheVersion]);
}
