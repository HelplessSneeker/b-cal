import { type CalendarEntry } from '@/lib/stores/calendarStore';
import { getEventTopPosition, getEventHeight } from '@/lib/calendar/time-utils';

export interface EventLayout {
  entry: CalendarEntry;
  column: number;
  totalColumns: number;
  left: number;
  width: number;
}

export interface OverflowGroup {
  allEntries: CalendarEntry[];
  hiddenEntries: CalendarEntry[];
  hiddenCount: number;
  left: number;
  width: number;
  topPx: number;
  heightPx: number;
}

export interface OverlapLayoutResult {
  visibleEvents: EventLayout[];
  overflowGroups: OverflowGroup[];
}

interface ColumnAssignment {
  entry: CalendarEntry;
  column: number;
}

interface CollisionGroup {
  entries: CalendarEntry[];
  assignments: ColumnAssignment[];
  totalColumns: number;
}

function eventsOverlap(a: CalendarEntry, b: CalendarEntry): boolean {
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

function buildCollisionGroups(entries: CalendarEntry[]): CollisionGroup[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => {
    const startDiff = a.startDate.getTime() - b.startDate.getTime();
    if (startDiff !== 0) return startDiff;
    // Longer events first (descending duration)
    const aDuration = a.endDate.getTime() - a.startDate.getTime();
    const bDuration = b.endDate.getTime() - b.startDate.getTime();
    return bDuration - aDuration;
  });

  const groups: CollisionGroup[] = [];
  let currentGroup: CalendarEntry[] = [sorted[0]];
  let maxEndDate = sorted[0].endDate;

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i];
    if (event.startDate < maxEndDate) {
      // Overlaps with current group (transitive)
      currentGroup.push(event);
      if (event.endDate > maxEndDate) {
        maxEndDate = event.endDate;
      }
    } else {
      // Start a new group
      groups.push(assignColumns(currentGroup));
      currentGroup = [event];
      maxEndDate = event.endDate;
    }
  }
  groups.push(assignColumns(currentGroup));

  return groups;
}

function assignColumns(entries: CalendarEntry[]): CollisionGroup {
  const columns: CalendarEntry[][] = [];
  const assignments: ColumnAssignment[] = [];

  for (const entry of entries) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const hasConflict = columns[col].some((existing) =>
        eventsOverlap(existing, entry),
      );
      if (!hasConflict) {
        columns[col].push(entry);
        assignments.push({ entry, column: col });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([entry]);
      assignments.push({ entry, column: columns.length - 1 });
    }
  }

  return {
    entries,
    assignments,
    totalColumns: columns.length,
  };
}

export function computeOverlapLayout(
  entries: CalendarEntry[],
  maxVisibleColumns: number,
): OverlapLayoutResult {
  const groups = buildCollisionGroups(entries);
  const visibleEvents: EventLayout[] = [];
  const overflowGroups: OverflowGroup[] = [];

  for (const group of groups) {
    if (group.totalColumns <= maxVisibleColumns) {
      // All events fit — no overflow
      for (const assignment of group.assignments) {
        visibleEvents.push({
          entry: assignment.entry,
          column: assignment.column,
          totalColumns: group.totalColumns,
          left: (assignment.column / group.totalColumns) * 100,
          width: (1 / group.totalColumns) * 100,
        });
      }
    } else {
      // Overflow: columns 0..maxVisibleColumns-2 are visible,
      // column maxVisibleColumns-1 becomes overflow pill,
      // events in columns >= maxVisibleColumns-1 are hidden
      const visibleColCount = maxVisibleColumns;
      const overflowColIndex = maxVisibleColumns - 1;

      const hiddenEntries: CalendarEntry[] = [];

      for (const assignment of group.assignments) {
        if (assignment.column < overflowColIndex) {
          visibleEvents.push({
            entry: assignment.entry,
            column: assignment.column,
            totalColumns: visibleColCount,
            left: (assignment.column / visibleColCount) * 100,
            width: (1 / visibleColCount) * 100,
          });
        } else {
          hiddenEntries.push(assignment.entry);
        }
      }

      // Compute overflow pill position spanning the group's time extent
      const allGroupEntries = group.entries;
      const earliestStart = allGroupEntries.reduce(
        (min, e) => (e.startDate < min ? e.startDate : min),
        allGroupEntries[0].startDate,
      );
      const latestEnd = allGroupEntries.reduce(
        (max, e) => (e.endDate > max ? e.endDate : max),
        allGroupEntries[0].endDate,
      );

      overflowGroups.push({
        allEntries: allGroupEntries,
        hiddenEntries,
        hiddenCount: hiddenEntries.length,
        left: (overflowColIndex / visibleColCount) * 100,
        width: (1 / visibleColCount) * 100,
        topPx: getEventTopPosition(earliestStart),
        heightPx: getEventHeight(earliestStart, latestEnd),
      });
    }
  }

  return { visibleEvents, overflowGroups };
}
