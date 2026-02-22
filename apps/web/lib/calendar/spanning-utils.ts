import { type CalendarEntry } from '@/lib/stores/calendarStore';

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function entryOverlapsDay(entry: CalendarEntry, day: Date): boolean {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return entry.startDate <= dayEnd && entry.endDate >= dayStart;
}

export interface SpanningEntry {
  entry: CalendarEntry;
  startCol: number;
  span: number;
  row: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export function computeSpanningEntries(
  entries: CalendarEntry[],
  rowDays: Date[],
): SpanningEntry[] {
  const results: SpanningEntry[] = [];

  const rowStart = new Date(rowDays[0]);
  rowStart.setHours(0, 0, 0, 0);
  const rowEnd = new Date(rowDays[rowDays.length - 1]);
  rowEnd.setHours(23, 59, 59, 999);

  for (const entry of entries) {
    let startCol = -1;
    let endCol = -1;

    for (let i = 0; i < rowDays.length; i++) {
      if (entryOverlapsDay(entry, rowDays[i])) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    }

    if (startCol === -1) continue;

    const span = endCol - startCol + 1;
    const continuesBefore = entry.startDate < rowStart;
    const continuesAfter = entry.endDate > rowEnd;

    results.push({
      entry,
      startCol,
      span,
      row: 0,
      continuesBefore,
      continuesAfter,
    });
  }

  return allocateRows(results);
}

function allocateRows(entries: SpanningEntry[]): SpanningEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return b.span - a.span;
  });

  const rowOccupancy: boolean[][] = [];

  for (const entry of sorted) {
    let row = 0;
    while (true) {
      if (!rowOccupancy[row]) {
        rowOccupancy[row] = new Array(7).fill(false);
      }

      let fits = true;
      for (let col = entry.startCol; col < entry.startCol + entry.span; col++) {
        if (rowOccupancy[row][col]) {
          fits = false;
          break;
        }
      }

      if (fits) break;
      row++;
    }

    if (!rowOccupancy[row]) {
      rowOccupancy[row] = new Array(7).fill(false);
    }
    for (let col = entry.startCol; col < entry.startCol + entry.span; col++) {
      rowOccupancy[row][col] = true;
    }

    entry.row = row;
  }

  return sorted;
}

export interface DaySpanInfo {
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export function getDaySpanInfo(
  entry: CalendarEntry,
  currentDay: Date,
): DaySpanInfo {
  const dayStart = new Date(currentDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDay);
  dayEnd.setHours(23, 59, 59, 999);

  return {
    continuesBefore: entry.startDate < dayStart,
    continuesAfter: entry.endDate > dayEnd,
  };
}
