import { RecurrenceFrequency } from '../enums/recurrence-frequency.enum';
import { composeSyntheticId } from './occurrence-id';

interface RecurrenceException {
  originalDate: Date;
  isCancelled: boolean;
  title?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  content?: string | null;
  wholeDay?: boolean | null;
}

interface RecurringEntry {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  content: string | null;
  wholeDay: boolean | null;
  userId: string;
  calendarId: string | null;
  recurrenceFrequency: string;
  recurrenceByDay: string | null;
  recurrenceUntil: Date | null;
  reminderType: string | null;
  reminderAmount: number | null;
  reminderUnit: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface VirtualOccurrence {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  content: string | null;
  wholeDay: boolean | null;
  userId: string;
  calendarId: string | null;
  isRecurring: boolean;
  recurrenceFrequency: string;
  recurrenceByDay: string | null;
  recurrenceUntil: Date | null;
  reminderType: string | null;
  reminderAmount: number | null;
  reminderUnit: string | null;
  originalDate: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(
  date: Date,
  months: number,
  originalDayOfMonth: number,
): Date {
  const result = new Date(date);
  result.setUTCDate(1); // Prevent JS overflow when target month has fewer days
  result.setUTCMonth(result.getUTCMonth() + months);
  // Clamp day-of-month to the last day of the new month
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDayOfMonth, lastDay));
  return result;
}

function generateCandidateDates(
  entry: RecurringEntry,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const frequency = entry.recurrenceFrequency as RecurrenceFrequency;
  const dates: Date[] = [];
  const entryStart = new Date(entry.startDate);
  const originalDayOfMonth = entryStart.getUTCDate();

  if (frequency === RecurrenceFrequency.WEEKLY && entry.recurrenceByDay) {
    const allowedDays = new Set(
      entry.recurrenceByDay.split(',').map((d) => DAY_NAMES.indexOf(d)),
    );
    // Start from the entry's start date or the window start, whichever is earlier
    // We need to start from entryStart to correctly iterate through all matching days
    let cursor = new Date(entryStart);
    while (cursor <= windowEnd) {
      if (cursor >= windowStart && allowedDays.has(cursor.getUTCDay())) {
        dates.push(new Date(cursor));
      } else if (cursor < windowStart && allowedDays.has(cursor.getUTCDay())) {
        // Skip, before window
      }
      cursor = addDays(cursor, 1);
      // Safety: cap at window end + 1 day
    }
    return dates;
  }

  let cursor = new Date(entryStart);
  let monthCount = 0;

  while (cursor <= windowEnd) {
    if (cursor >= windowStart) {
      dates.push(new Date(cursor));
    }

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        cursor = addDays(cursor, 1);
        break;
      case RecurrenceFrequency.WEEKLY:
        cursor = addDays(cursor, 7);
        break;
      case RecurrenceFrequency.MONTHLY:
        monthCount++;
        cursor = addMonths(entryStart, monthCount, originalDayOfMonth);
        break;
    }
  }

  return dates;
}

export function expandRecurringEntry(
  entry: RecurringEntry,
  exceptions: RecurrenceException[],
  queryStart?: Date,
  queryEnd?: Date,
): VirtualOccurrence[] {
  const now = new Date();
  const effectiveStart = queryStart ?? entry.startDate;
  const effectiveEnd = queryEnd ?? new Date(now.getTime() + ONE_YEAR_MS);

  const windowStart = new Date(
    Math.max(
      new Date(entry.startDate).getTime(),
      new Date(effectiveStart).getTime(),
    ),
  );
  const windowEnd = entry.recurrenceUntil
    ? new Date(
        Math.min(
          new Date(entry.recurrenceUntil).getTime(),
          new Date(effectiveEnd).getTime(),
        ),
      )
    : new Date(effectiveEnd);

  if (windowStart > windowEnd) return [];

  const exceptionMap = new Map<string, RecurrenceException>();
  for (const exc of exceptions) {
    exceptionMap.set(new Date(exc.originalDate).toISOString(), exc);
  }

  const durationMs =
    new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime();

  const candidateDates = generateCandidateDates(entry, windowStart, windowEnd);
  const occurrences: VirtualOccurrence[] = [];

  for (const candidateDate of candidateDates) {
    const dateKey = candidateDate.toISOString();
    const exception = exceptionMap.get(dateKey);

    if (exception?.isCancelled) continue;

    const occurrenceStart = exception?.startDate
      ? new Date(exception.startDate)
      : candidateDate;
    const occurrenceEnd = exception?.endDate
      ? new Date(exception.endDate)
      : new Date(candidateDate.getTime() + durationMs);

    occurrences.push({
      id: composeSyntheticId(entry.id, candidateDate),
      title: exception?.title ?? entry.title,
      startDate: occurrenceStart,
      endDate: occurrenceEnd,
      content:
        exception?.content !== undefined ? exception.content : entry.content,
      wholeDay:
        exception?.wholeDay !== undefined ? exception.wholeDay : entry.wholeDay,
      userId: entry.userId,
      calendarId: entry.calendarId,
      isRecurring: true,
      recurrenceFrequency: entry.recurrenceFrequency,
      recurrenceByDay: entry.recurrenceByDay,
      recurrenceUntil: entry.recurrenceUntil,
      reminderType: entry.reminderType,
      reminderAmount: entry.reminderAmount,
      reminderUnit: entry.reminderUnit,
      originalDate: candidateDate,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  }

  return occurrences;
}
