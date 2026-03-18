import { describe, it, expect } from 'vitest';
import {
  weekStartToDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getWeekNumber,
  getMonthGridDates,
} from '@/lib/calendar/date-utils';

describe('weekStartToDay', () => {
  it('returns 0 for sunday', () => {
    expect(weekStartToDay('sunday')).toBe(0);
  });

  it('returns 6 for saturday', () => {
    expect(weekStartToDay('saturday')).toBe(6);
  });

  it('returns 1 for monday', () => {
    expect(weekStartToDay('monday')).toBe(1);
  });

  it('defaults to 1 (monday) for unknown values', () => {
    expect(weekStartToDay('friday')).toBe(1);
    expect(weekStartToDay('')).toBe(1);
  });
});

describe('getStartOfWeek', () => {
  it('returns Monday for a Wednesday with default weekStart', () => {
    // 2026-03-18 is a Wednesday
    const wed = new Date(2026, 2, 18, 15, 30);
    const result = getStartOfWeek(wed);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(16); // Monday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns the same day if it is Monday and weekStart is Monday', () => {
    const mon = new Date(2026, 2, 16, 10, 0);
    const result = getStartOfWeek(mon, 1);
    expect(result.getDate()).toBe(16);
  });

  it('returns Sunday for weekStart = 0 (Sunday)', () => {
    // 2026-03-18 is Wednesday
    const wed = new Date(2026, 2, 18);
    const result = getStartOfWeek(wed, 0);
    expect(result.getDate()).toBe(15); // Sunday
  });

  it('returns Saturday for weekStart = 6 (Saturday)', () => {
    // 2026-03-18 is Wednesday
    const wed = new Date(2026, 2, 18);
    const result = getStartOfWeek(wed, 6);
    expect(result.getDate()).toBe(14); // Saturday
  });

  it('handles week crossing month boundary', () => {
    // 2026-03-01 is Sunday. With Monday weekStart, start should be Feb 23
    const mar1 = new Date(2026, 2, 1);
    const result = getStartOfWeek(mar1, 1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(23);
  });
});

describe('getEndOfWeek', () => {
  it('returns Sunday for default weekStart (Monday)', () => {
    // 2026-03-18 is Wednesday
    const wed = new Date(2026, 2, 18);
    const result = getEndOfWeek(wed);
    expect(result.getDate()).toBe(22); // Sunday
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });

  it('returns Saturday for weekStart = 0 (Sunday)', () => {
    const wed = new Date(2026, 2, 18);
    const result = getEndOfWeek(wed, 0);
    expect(result.getDate()).toBe(21); // Saturday
  });
});

describe('getStartOfMonth', () => {
  it('returns first day of the month', () => {
    const result = getStartOfMonth(new Date(2026, 2, 18));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(1);
  });
});

describe('getEndOfMonth', () => {
  it('returns last day of the month', () => {
    const result = getEndOfMonth(new Date(2026, 2, 18));
    expect(result.getDate()).toBe(31); // March has 31 days
    expect(result.getHours()).toBe(23);
    expect(result.getSeconds()).toBe(59);
  });

  it('handles February in a non-leap year', () => {
    const result = getEndOfMonth(new Date(2027, 1, 1));
    expect(result.getDate()).toBe(28);
  });

  it('handles February in a leap year', () => {
    const result = getEndOfMonth(new Date(2028, 1, 1));
    expect(result.getDate()).toBe(29);
  });
});

describe('getWeekNumber', () => {
  it('returns week 1 for Jan 1, 2026 (Thursday)', () => {
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it('returns week 53 for Dec 31, 2026 (belongs to ISO week 53)', () => {
    // 2026-12-31 is Thursday. Jan 1 2026 is Thursday, so this year has week 53.
    expect(getWeekNumber(new Date(2026, 11, 31))).toBe(53);
  });

  it('returns week 1 for Jan 5, 2026 (Monday of week 2? No — Jan 5 is Monday)', () => {
    // Jan 1 is Thu → week 1. Jan 5 is Mon → week 2
    expect(getWeekNumber(new Date(2026, 0, 5))).toBe(2);
  });

  it('returns correct week for mid-year date', () => {
    // 2026-06-15 is a Monday
    expect(getWeekNumber(new Date(2026, 5, 15))).toBe(25);
  });

  it('handles year boundary where Dec 31 belongs to week 1 of next year', () => {
    // 2025-12-31 is a Wednesday. Jan 1 2025 was Wednesday.
    // ISO week: Dec 31 2025 = week 1 of 2026
    expect(getWeekNumber(new Date(2025, 11, 31))).toBe(1);
  });
});

describe('getMonthGridDates', () => {
  it('returns exactly 42 dates', () => {
    const dates = getMonthGridDates(new Date(2026, 2, 15));
    expect(dates).toHaveLength(42);
  });

  it('starts on the correct weekday (Monday by default)', () => {
    const dates = getMonthGridDates(new Date(2026, 2, 15));
    // March 2026: first day is Sunday. With Monday weekStart, grid starts Feb 23 (Monday)
    expect(dates[0].getDay()).toBe(1); // Monday
  });

  it('starts on Sunday when weekStartDay is 0', () => {
    const dates = getMonthGridDates(new Date(2026, 2, 15), 0);
    expect(dates[0].getDay()).toBe(0); // Sunday
  });

  it('includes days from previous and next months', () => {
    const dates = getMonthGridDates(new Date(2026, 2, 15)); // March 2026
    // First date should be in February (Feb 23)
    expect(dates[0].getMonth()).toBe(1); // February
    // Last date should be in April
    expect(dates[41].getMonth()).toBe(3); // April
  });

  it('covers the entire target month', () => {
    const dates = getMonthGridDates(new Date(2026, 2, 15)); // March 2026
    const marchDates = dates.filter((d) => d.getMonth() === 2);
    expect(marchDates).toHaveLength(31); // March has 31 days
  });

  it('dates are sequential (each day is 1 day after the previous)', () => {
    const dates = getMonthGridDates(new Date(2026, 5, 1));
    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getDate() - dates[i - 1].getDate();
      // Either +1 or a month rollover (e.g., 30 → 1 = -29)
      expect(diff === 1 || diff < 0).toBe(true);
    }
  });
});
