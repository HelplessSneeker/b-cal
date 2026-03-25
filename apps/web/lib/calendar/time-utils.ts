import { HOUR_HEIGHT, START_HOUR } from '@/lib/calendar/calendar-constants';
import {
  getTimePartsFormatter,
  getDateTimePartsFormatter,
  getDateTimeLocalFormatter,
  getDatePartsFormatter,
} from '@/lib/calendar/formatter-cache';

export function getTimeInTimezone(
  date: Date,
  timezone: string,
): { hours: number; minutes: number } {
  const parts = getTimePartsFormatter(timezone).formatToParts(date);
  return {
    hours: parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0'),
    minutes: parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0'),
  };
}

function getTimezoneOffsetMs(utcDate: Date, timezone: string): number {
  const parts = getDateTimePartsFormatter(timezone).formatToParts(utcDate);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0');
  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
  );
  return localAsUtc - utcDate.getTime();
}

export function formatDateTimeLocal(date: Date, timezone: string): string {
  const parts = getDateTimeLocalFormatter(timezone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function parseDateTimeLocal(value: string, timezone: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return new Date(value);
  const [, ys, ms, ds, hs, mins] = match;
  const [y, m, d, h, min] = [+ys!, +ms!, +ds!, +hs!, +mins!];

  const utcGuess = new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
  const offset = getTimezoneOffsetMs(utcGuess, timezone);
  const result = new Date(utcGuess.getTime() - offset);

  // Verify for DST edge cases — offset may differ at the result time
  const verifyOffset = getTimezoneOffsetMs(result, timezone);
  if (verifyOffset !== offset) {
    return new Date(utcGuess.getTime() - verifyOffset);
  }

  return result;
}

export function createSlotTime(
  baseDate: Date,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  const parts = getDatePartsFormatter(timezone).formatToParts(baseDate);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const dateStr = `${get('year')}-${get('month')}-${get('day')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return parseDateTimeLocal(dateStr, timezone);
}

export function getEventTopPosition(
  startTime: Date,
  timezone?: string,
): number {
  const { hours, minutes } = timezone
    ? getTimeInTimezone(startTime, timezone)
    : { hours: startTime.getHours(), minutes: startTime.getMinutes() };
  const totalMinutes = (hours - START_HOUR) * 60 + minutes;
  return (totalMinutes / 60) * HOUR_HEIGHT;
}

export function getEventHeight(start: Date, end: Date): number {
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return (durationMinutes / 60) * HOUR_HEIGHT;
}

export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function getTimeFromPosition(yPosition: number, baseDate?: Date): Date {
  const totalMinutes = (yPosition / HOUR_HEIGHT) * 60;
  const hours = Math.floor(totalMinutes / 60) + START_HOUR;
  const minutes = Math.round(totalMinutes % 60);

  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}
