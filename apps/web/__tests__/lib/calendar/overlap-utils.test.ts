import { describe, it, expect } from 'vitest';
import { computeOverlapLayout } from '@/lib/calendar/overlap-utils';
import { type CalendarEntry } from '@/lib/stores/calendarStore';

function makeEntry(
  id: string,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): CalendarEntry {
  return {
    id,
    title: `Event ${id}`,
    startDate: new Date(2025, 5, 15, startHour, startMin),
    endDate: new Date(2025, 5, 15, endHour, endMin),
    wholeDay: false,
  };
}

describe('computeOverlapLayout', () => {
  it('returns empty result for no events', () => {
    const result = computeOverlapLayout([], 5);
    expect(result.visibleEvents).toHaveLength(0);
    expect(result.overflowGroups).toHaveLength(0);
  });

  it('returns single event at full width', () => {
    const entry = makeEntry('1', 9, 0, 10, 0);
    const result = computeOverlapLayout([entry], 5);

    expect(result.visibleEvents).toHaveLength(1);
    expect(result.overflowGroups).toHaveLength(0);

    const layout = result.visibleEvents[0];
    expect(layout.entry.id).toBe('1');
    expect(layout.column).toBe(0);
    expect(layout.totalColumns).toBe(1);
    expect(layout.left).toBe(0);
    expect(layout.width).toBe(100);
  });

  it('gives full width to two non-overlapping events', () => {
    const a = makeEntry('1', 9, 0, 10, 0);
    const b = makeEntry('2', 11, 0, 12, 0);
    const result = computeOverlapLayout([a, b], 5);

    expect(result.visibleEvents).toHaveLength(2);
    expect(result.overflowGroups).toHaveLength(0);

    for (const layout of result.visibleEvents) {
      expect(layout.totalColumns).toBe(1);
      expect(layout.left).toBe(0);
      expect(layout.width).toBe(100);
    }
  });

  it('splits two overlapping events into 50% width each', () => {
    const a = makeEntry('1', 9, 0, 10, 30);
    const b = makeEntry('2', 10, 0, 11, 0);
    const result = computeOverlapLayout([a, b], 5);

    expect(result.visibleEvents).toHaveLength(2);
    expect(result.overflowGroups).toHaveLength(0);

    const layouts = result.visibleEvents.sort((x, y) => x.column - y.column);
    expect(layouts[0].column).toBe(0);
    expect(layouts[0].totalColumns).toBe(2);
    expect(layouts[0].left).toBe(0);
    expect(layouts[0].width).toBe(50);

    expect(layouts[1].column).toBe(1);
    expect(layouts[1].totalColumns).toBe(2);
    expect(layouts[1].left).toBe(50);
    expect(layouts[1].width).toBe(50);
  });

  it('handles three overlapping events', () => {
    const a = makeEntry('1', 9, 0, 11, 0);
    const b = makeEntry('2', 9, 30, 10, 30);
    const c = makeEntry('3', 10, 0, 11, 30);
    const result = computeOverlapLayout([a, b, c], 5);

    expect(result.visibleEvents).toHaveLength(3);
    expect(result.overflowGroups).toHaveLength(0);

    for (const layout of result.visibleEvents) {
      expect(layout.totalColumns).toBe(3);
      expect(layout.width).toBeCloseTo(100 / 3);
    }

    const columns = result.visibleEvents
      .map((l) => l.column)
      .sort((a, b) => a - b);
    expect(columns).toEqual([0, 1, 2]);
  });

  it('groups transitively overlapping events (A↔B, B↔C, not A↔C)', () => {
    const a = makeEntry('1', 9, 0, 10, 0);
    const b = makeEntry('2', 9, 30, 11, 0);
    const c = makeEntry('3', 10, 30, 12, 0);
    const result = computeOverlapLayout([a, b, c], 5);

    // All three should be in the same group since they are transitively connected
    expect(result.visibleEvents).toHaveLength(3);

    // All should share the same totalColumns
    const totalCols = result.visibleEvents.map((l) => l.totalColumns);
    expect(new Set(totalCols).size).toBe(1);
  });

  it('reuses columns greedily when earlier event ends', () => {
    const a = makeEntry('1', 9, 0, 10, 0);
    const b = makeEntry('2', 9, 30, 11, 0);
    const c = makeEntry('3', 10, 0, 11, 30); // A ends before C starts, so C can reuse col 0

    const result = computeOverlapLayout([a, b, c], 5);

    // All in one group (transitive overlap via B)
    expect(result.visibleEvents).toHaveLength(3);

    // A is in col 0, B in col 1, C can go back to col 0 since A ended
    const layoutMap = new Map(result.visibleEvents.map((l) => [l.entry.id, l]));
    expect(layoutMap.get('1')!.column).toBe(0);
    expect(layoutMap.get('2')!.column).toBe(1);
    expect(layoutMap.get('3')!.column).toBe(0);
  });

  it('does not create overflow when exactly at max columns', () => {
    // Create 3 overlapping events with maxVisibleColumns = 3
    const a = makeEntry('1', 9, 0, 11, 0);
    const b = makeEntry('2', 9, 0, 11, 0);
    const c = makeEntry('3', 9, 0, 11, 0);
    const result = computeOverlapLayout([a, b, c], 3);

    expect(result.visibleEvents).toHaveLength(3);
    expect(result.overflowGroups).toHaveLength(0);
  });

  it('creates overflow when exceeding max columns', () => {
    // 4 overlapping events with maxVisibleColumns = 3
    const a = makeEntry('1', 9, 0, 11, 0);
    const b = makeEntry('2', 9, 0, 11, 0);
    const c = makeEntry('3', 9, 0, 11, 0);
    const d = makeEntry('4', 9, 0, 11, 0);
    const result = computeOverlapLayout([a, b, c, d], 3);

    // 2 visible (columns 0 and 1), overflow pill at column 2
    expect(result.visibleEvents).toHaveLength(2);
    expect(result.overflowGroups).toHaveLength(1);

    const overflow = result.overflowGroups[0];
    expect(overflow.hiddenCount).toBe(2); // events in columns 2 and 3
    expect(overflow.allEntries).toHaveLength(4);
    expect(overflow.hiddenEntries).toHaveLength(2);
  });

  it('positions overflow pill correctly', () => {
    const a = makeEntry('1', 9, 0, 11, 0);
    const b = makeEntry('2', 9, 0, 11, 0);
    const c = makeEntry('3', 9, 0, 11, 0);
    const d = makeEntry('4', 9, 0, 11, 0);
    const result = computeOverlapLayout([a, b, c, d], 3);

    const overflow = result.overflowGroups[0];
    // Last column position: column 2 out of 3
    expect(overflow.left).toBeCloseTo((2 / 3) * 100);
    expect(overflow.width).toBeCloseTo((1 / 3) * 100);
    // topPx and heightPx should span 9:00-11:00
    expect(overflow.topPx).toBeGreaterThan(0);
    expect(overflow.heightPx).toBeGreaterThan(0);
  });

  it('visible events in overflow scenario have correct layout against maxVisibleColumns', () => {
    const a = makeEntry('1', 9, 0, 11, 0);
    const b = makeEntry('2', 9, 0, 11, 0);
    const c = makeEntry('3', 9, 0, 11, 0);
    const d = makeEntry('4', 9, 0, 11, 0);
    const result = computeOverlapLayout([a, b, c, d], 3);

    // Visible events should be sized against maxVisibleColumns (3), not totalColumns (4)
    for (const layout of result.visibleEvents) {
      expect(layout.totalColumns).toBe(3);
      expect(layout.width).toBeCloseTo(100 / 3);
    }
  });
});
