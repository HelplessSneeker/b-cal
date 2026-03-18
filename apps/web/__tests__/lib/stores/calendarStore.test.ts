import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCalendarStore,
  CalendarView,
  getAdjacentDate,
  isRangeCovered,
} from '@/lib/stores/calendarStore';

beforeEach(() => {
  useCalendarStore.setState({
    view: CalendarView.Month,
    currentDate: new Date(2026, 2, 18),
    entries: [],
    entryMap: new Map(),
    loadedRanges: [],
    cacheVersion: 0,
    isFetching: false,
    isEntryModalOpen: false,
    editingEntry: null,
    defaultStartDate: null,
  });
  // Clear localStorage to avoid side effects
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
  });
});

describe('getAdjacentDate', () => {
  const base = new Date(2026, 2, 18); // March 18, 2026

  it('adds 1 day in Day view', () => {
    const result = getAdjacentDate(base, CalendarView.Day, 1);
    expect(result.getDate()).toBe(19);
  });

  it('subtracts 1 day in Day view', () => {
    const result = getAdjacentDate(base, CalendarView.Day, -1);
    expect(result.getDate()).toBe(17);
  });

  it('adds 7 days in Week view', () => {
    const result = getAdjacentDate(base, CalendarView.Week, 1);
    expect(result.getDate()).toBe(25);
  });

  it('subtracts 7 days in Week view', () => {
    const result = getAdjacentDate(base, CalendarView.Week, -1);
    expect(result.getDate()).toBe(11);
  });

  it('moves to next month in Month view', () => {
    const result = getAdjacentDate(base, CalendarView.Month, 1);
    expect(result.getMonth()).toBe(3); // April
  });

  it('moves to previous month in Month view', () => {
    const result = getAdjacentDate(base, CalendarView.Month, -1);
    expect(result.getMonth()).toBe(1); // February
  });
});

describe('isRangeCovered', () => {
  it('returns true when range is fully covered', () => {
    const ranges = [{ start: 100, end: 500 }];
    expect(isRangeCovered(ranges, 200, 400)).toBe(true);
  });

  it('returns false when range is not covered', () => {
    const ranges = [{ start: 100, end: 300 }];
    expect(isRangeCovered(ranges, 200, 400)).toBe(false);
  });

  it('returns false when no ranges exist', () => {
    expect(isRangeCovered([], 100, 200)).toBe(false);
  });

  it('returns true when range exactly matches', () => {
    const ranges = [{ start: 100, end: 500 }];
    expect(isRangeCovered(ranges, 100, 500)).toBe(true);
  });
});

describe('calendarStore actions', () => {
  it('setView updates view', () => {
    useCalendarStore.getState().setView(CalendarView.Week);
    expect(useCalendarStore.getState().view).toBe(CalendarView.Week);
  });

  it('setCurrentDate updates currentDate', () => {
    const newDate = new Date(2026, 5, 1);
    useCalendarStore.getState().setCurrentDate(newDate);
    expect(useCalendarStore.getState().currentDate).toEqual(newDate);
  });

  it('mergeEntries adds new entries without removing existing ones', () => {
    const entry1 = {
      id: 'e1',
      title: 'A',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    const entry2 = {
      id: 'e2',
      title: 'B',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };

    useCalendarStore.getState().mergeEntries([entry1]);
    useCalendarStore.getState().mergeEntries([entry2]);

    const { entries, entryMap } = useCalendarStore.getState();
    expect(entries).toHaveLength(2);
    expect(entryMap.get('e1')).toBeDefined();
    expect(entryMap.get('e2')).toBeDefined();
  });

  it('mergeEntries updates existing entry by id', () => {
    const entry = {
      id: 'e1',
      title: 'Original',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().mergeEntries([entry]);

    const updated = { ...entry, title: 'Updated' };
    useCalendarStore.getState().mergeEntries([updated]);

    const { entries, entryMap } = useCalendarStore.getState();
    expect(entries).toHaveLength(1);
    expect(entryMap.get('e1')!.title).toBe('Updated');
  });

  it('replaceEntries clears existing entries', () => {
    const entry1 = {
      id: 'e1',
      title: 'A',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    const entry2 = {
      id: 'e2',
      title: 'B',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };

    useCalendarStore.getState().mergeEntries([entry1]);
    useCalendarStore.getState().replaceEntries([entry2]);

    const { entries, entryMap } = useCalendarStore.getState();
    expect(entries).toHaveLength(1);
    expect(entryMap.has('e1')).toBe(false);
    expect(entryMap.get('e2')!.title).toBe('B');
  });

  it('addLoadedRange tracks and merges ranges', () => {
    useCalendarStore.getState().addLoadedRange(100, 300);
    useCalendarStore.getState().addLoadedRange(200, 500);

    const { loadedRanges } = useCalendarStore.getState();
    // Should merge overlapping into single range [100, 500]
    expect(loadedRanges).toHaveLength(1);
    expect(loadedRanges[0].start).toBe(100);
    expect(loadedRanges[0].end).toBe(500);
  });

  it('addLoadedRange keeps separate non-overlapping ranges', () => {
    useCalendarStore.getState().addLoadedRange(100, 200);
    useCalendarStore.getState().addLoadedRange(400, 500);

    const { loadedRanges } = useCalendarStore.getState();
    expect(loadedRanges).toHaveLength(2);
  });

  it('clearCache resets entries and loadedRanges', () => {
    const entry = {
      id: 'e1',
      title: 'A',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().mergeEntries([entry]);
    useCalendarStore.getState().addLoadedRange(100, 200);
    useCalendarStore.getState().clearCache();

    const state = useCalendarStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(state.entryMap.size).toBe(0);
    expect(state.loadedRanges).toHaveLength(0);
  });

  it('invalidateCache clears loadedRanges and increments cacheVersion', () => {
    useCalendarStore.getState().addLoadedRange(100, 200);
    const versionBefore = useCalendarStore.getState().cacheVersion;

    useCalendarStore.getState().invalidateCache();

    const state = useCalendarStore.getState();
    expect(state.loadedRanges).toHaveLength(0);
    expect(state.cacheVersion).toBe(versionBefore + 1);
  });

  it('navigate moves forward in Day view', () => {
    useCalendarStore.setState({
      view: CalendarView.Day,
      currentDate: new Date(2026, 2, 18),
    });
    useCalendarStore.getState().navigate(1);
    expect(useCalendarStore.getState().currentDate.getDate()).toBe(19);
  });

  it('navigate moves backward in Month view', () => {
    useCalendarStore.setState({
      view: CalendarView.Month,
      currentDate: new Date(2026, 2, 18),
    });
    useCalendarStore.getState().navigate(-1);
    expect(useCalendarStore.getState().currentDate.getMonth()).toBe(1);
  });

  it('openEntryModal sets modal state', () => {
    const entry = {
      id: 'e1',
      title: 'A',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().openEntryModal(entry);

    const state = useCalendarStore.getState();
    expect(state.isEntryModalOpen).toBe(true);
    expect(state.editingEntry).toEqual(entry);
  });

  it('openEntryModal with no args opens for creation', () => {
    useCalendarStore.getState().openEntryModal();
    const state = useCalendarStore.getState();
    expect(state.isEntryModalOpen).toBe(true);
    expect(state.editingEntry).toBeNull();
  });

  it('closeEntryModal resets modal state', () => {
    useCalendarStore.getState().openEntryModal();
    useCalendarStore.getState().closeEntryModal();

    const state = useCalendarStore.getState();
    expect(state.isEntryModalOpen).toBe(false);
    expect(state.editingEntry).toBeNull();
    expect(state.defaultStartDate).toBeNull();
  });

  it('addEntry adds a single entry', () => {
    const entry = {
      id: 'new',
      title: 'New',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().addEntry(entry);

    expect(useCalendarStore.getState().entryMap.get('new')).toBeDefined();
    expect(useCalendarStore.getState().entries).toHaveLength(1);
  });

  it('updateEntry replaces an existing entry', () => {
    const entry = {
      id: 'e1',
      title: 'Original',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().addEntry(entry);
    useCalendarStore.getState().updateEntry({ ...entry, title: 'Updated' });

    expect(useCalendarStore.getState().entryMap.get('e1')!.title).toBe(
      'Updated',
    );
    expect(useCalendarStore.getState().entries).toHaveLength(1);
  });

  it('deleteEntry removes an entry', () => {
    const entry = {
      id: 'e1',
      title: 'A',
      startDate: new Date(),
      endDate: new Date(),
      wholeDay: false,
    };
    useCalendarStore.getState().addEntry(entry);
    useCalendarStore.getState().deleteEntry('e1');

    expect(useCalendarStore.getState().entryMap.has('e1')).toBe(false);
    expect(useCalendarStore.getState().entries).toHaveLength(0);
  });

  it('setIsFetching updates fetching state', () => {
    useCalendarStore.getState().setIsFetching(true);
    expect(useCalendarStore.getState().isFetching).toBe(true);

    useCalendarStore.getState().setIsFetching(false);
    expect(useCalendarStore.getState().isFetching).toBe(false);
  });
});
