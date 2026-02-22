import { describe, it, expect } from 'vitest';
import {
  isSameDay,
  entryOverlapsDay,
  computeSpanningEntries,
  getDaySpanInfo,
} from '@/lib/calendar/spanning-utils';
import { type CalendarEntry } from '@/lib/stores/calendarStore';

describe('isSameDay', () => {
  it('returns true for the same day', () => {
    const a = new Date(2025, 5, 15, 10, 0);
    const b = new Date(2025, 5, 15, 18, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2025, 5, 16);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for different months', () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2025, 6, 15);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for different years', () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2026, 5, 15);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('entryOverlapsDay', () => {
  const entry: CalendarEntry = {
    id: '1',
    title: 'Test',
    startDate: new Date(2025, 5, 15, 10, 0),
    endDate: new Date(2025, 5, 15, 14, 0),
    wholeDay: false,
  };

  it('returns true when entry falls on the given day', () => {
    expect(entryOverlapsDay(entry, new Date(2025, 5, 15))).toBe(true);
  });

  it('returns false when entry is on a different day', () => {
    expect(entryOverlapsDay(entry, new Date(2025, 5, 16))).toBe(false);
  });

  it('handles multi-day entries', () => {
    const multiDay: CalendarEntry = {
      id: '2',
      title: 'Multi',
      startDate: new Date(2025, 5, 15, 10, 0),
      endDate: new Date(2025, 5, 17, 14, 0),
      wholeDay: true,
    };
    expect(entryOverlapsDay(multiDay, new Date(2025, 5, 15))).toBe(true);
    expect(entryOverlapsDay(multiDay, new Date(2025, 5, 16))).toBe(true);
    expect(entryOverlapsDay(multiDay, new Date(2025, 5, 17))).toBe(true);
    expect(entryOverlapsDay(multiDay, new Date(2025, 5, 18))).toBe(false);
    expect(entryOverlapsDay(multiDay, new Date(2025, 5, 14))).toBe(false);
  });
});

describe('computeSpanningEntries', () => {
  // Monday June 16 to Sunday June 22, 2025
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(2025, 5, 16 + i);
    day.setHours(0, 0, 0, 0);
    return day;
  });

  it('computes correct column and span for a single-day entry', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Single',
      startDate: new Date(2025, 5, 18, 0, 0),
      endDate: new Date(2025, 5, 18, 23, 59),
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result).toHaveLength(1);
    expect(result[0].startCol).toBe(2); // Wednesday is index 2
    expect(result[0].span).toBe(1);
    expect(result[0].row).toBe(0);
    expect(result[0].continuesBefore).toBe(false);
    expect(result[0].continuesAfter).toBe(false);
  });

  it('computes correct span for a multi-day entry within the week', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Multi',
      startDate: new Date(2025, 5, 17, 0, 0), // Tuesday
      endDate: new Date(2025, 5, 19, 23, 59), // Thursday
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result).toHaveLength(1);
    expect(result[0].startCol).toBe(1); // Tuesday
    expect(result[0].span).toBe(3); // Tue, Wed, Thu
    expect(result[0].continuesBefore).toBe(false);
    expect(result[0].continuesAfter).toBe(false);
  });

  it('clamps entry to week boundaries and sets continuation flags', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Long',
      startDate: new Date(2025, 5, 14, 0, 0), // Before week start (Saturday)
      endDate: new Date(2025, 5, 24, 23, 59), // After week end (Tuesday next week)
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result).toHaveLength(1);
    expect(result[0].startCol).toBe(0); // Clamped to Monday
    expect(result[0].span).toBe(7); // Spans entire week
    expect(result[0].continuesBefore).toBe(true);
    expect(result[0].continuesAfter).toBe(true);
  });

  it('sets continuesBefore when entry starts before the week', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Continues Before',
      startDate: new Date(2025, 5, 14, 0, 0),
      endDate: new Date(2025, 5, 18, 23, 59), // Wednesday
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result[0].continuesBefore).toBe(true);
    expect(result[0].continuesAfter).toBe(false);
    expect(result[0].startCol).toBe(0);
    expect(result[0].span).toBe(3); // Mon, Tue, Wed
  });

  it('sets continuesAfter when entry ends after the week', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Continues After',
      startDate: new Date(2025, 5, 20, 0, 0), // Friday
      endDate: new Date(2025, 5, 25, 23, 59),
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result[0].continuesBefore).toBe(false);
    expect(result[0].continuesAfter).toBe(true);
    expect(result[0].startCol).toBe(4); // Friday
    expect(result[0].span).toBe(3); // Fri, Sat, Sun
  });

  it('excludes entries that do not overlap the week', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Other Week',
      startDate: new Date(2025, 5, 10, 0, 0),
      endDate: new Date(2025, 5, 12, 23, 59),
      wholeDay: true,
    };

    const result = computeSpanningEntries([entry], weekDays);
    expect(result).toHaveLength(0);
  });

  it('allocates rows to prevent overlap', () => {
    const entries: CalendarEntry[] = [
      {
        id: '1',
        title: 'A',
        startDate: new Date(2025, 5, 16, 0, 0), // Mon
        endDate: new Date(2025, 5, 18, 23, 59), // Wed
        wholeDay: true,
      },
      {
        id: '2',
        title: 'B',
        startDate: new Date(2025, 5, 17, 0, 0), // Tue
        endDate: new Date(2025, 5, 19, 23, 59), // Thu
        wholeDay: true,
      },
    ];

    const result = computeSpanningEntries(entries, weekDays);
    expect(result).toHaveLength(2);
    // They overlap on Tue-Wed, so must be in different rows
    const rows = result.map((r) => r.row);
    expect(rows).toContain(0);
    expect(rows).toContain(1);
  });

  it('shares row for non-overlapping entries', () => {
    const entries: CalendarEntry[] = [
      {
        id: '1',
        title: 'A',
        startDate: new Date(2025, 5, 16, 0, 0), // Mon
        endDate: new Date(2025, 5, 17, 23, 59), // Tue
        wholeDay: true,
      },
      {
        id: '2',
        title: 'B',
        startDate: new Date(2025, 5, 19, 0, 0), // Thu
        endDate: new Date(2025, 5, 20, 23, 59), // Fri
        wholeDay: true,
      },
    ];

    const result = computeSpanningEntries(entries, weekDays);
    expect(result).toHaveLength(2);
    // They don't overlap, so can share row 0
    expect(result[0].row).toBe(0);
    expect(result[1].row).toBe(0);
  });
});

describe('getDaySpanInfo', () => {
  it('returns no continuation for single-day entry', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Single',
      startDate: new Date(2025, 5, 15, 0, 0),
      endDate: new Date(2025, 5, 15, 23, 59),
      wholeDay: true,
    };

    const info = getDaySpanInfo(entry, new Date(2025, 5, 15));
    expect(info.continuesBefore).toBe(false);
    expect(info.continuesAfter).toBe(false);
  });

  it('returns continuesAfter on the first day of a multi-day entry', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Multi',
      startDate: new Date(2025, 5, 15, 0, 0),
      endDate: new Date(2025, 5, 17, 23, 59),
      wholeDay: true,
    };

    const info = getDaySpanInfo(entry, new Date(2025, 5, 15));
    expect(info.continuesBefore).toBe(false);
    expect(info.continuesAfter).toBe(true);
  });

  it('returns continuesBefore on the last day of a multi-day entry', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Multi',
      startDate: new Date(2025, 5, 15, 0, 0),
      endDate: new Date(2025, 5, 17, 23, 59),
      wholeDay: true,
    };

    const info = getDaySpanInfo(entry, new Date(2025, 5, 17));
    expect(info.continuesBefore).toBe(true);
    expect(info.continuesAfter).toBe(false);
  });

  it('returns both flags on a middle day of a multi-day entry', () => {
    const entry: CalendarEntry = {
      id: '1',
      title: 'Multi',
      startDate: new Date(2025, 5, 15, 0, 0),
      endDate: new Date(2025, 5, 17, 23, 59),
      wholeDay: true,
    };

    const info = getDaySpanInfo(entry, new Date(2025, 5, 16));
    expect(info.continuesBefore).toBe(true);
    expect(info.continuesAfter).toBe(true);
  });
});
