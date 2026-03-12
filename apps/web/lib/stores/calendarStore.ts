import { create } from 'zustand';

export enum CalendarView {
  Day = 'Day',
  Week = 'Week',
  Month = 'Month',
}

const STORAGE_PREFIX = 'b-cal:';

function loadStoredValue<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function storeValue(key: string, value: unknown): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function isValidDateString(v: unknown): v is string {
  return typeof v === 'string' && !isNaN(new Date(v).getTime());
}

function loadStoredDate(): Date {
  const iso = loadStoredValue<string>('currentDate', '', isValidDateString);
  return iso ? new Date(iso) : new Date();
}

const validViews = new Set<string>(Object.values(CalendarView));

function isCalendarView(v: unknown): v is CalendarView {
  return typeof v === 'string' && validViews.has(v);
}

export function getAdjacentDate(
  date: Date,
  view: CalendarView,
  direction: -1 | 1,
): Date {
  const newDate = new Date(date);
  switch (view) {
    case CalendarView.Day:
      newDate.setDate(newDate.getDate() + direction);
      break;
    case CalendarView.Week:
      newDate.setDate(newDate.getDate() + direction * 7);
      break;
    case CalendarView.Month:
      newDate.setMonth(newDate.getMonth() + direction);
      break;
  }
  return newDate;
}

export interface CalendarEntry {
  id: string;
  startDate: Date;
  endDate: Date;
  title: string;
  wholeDay: boolean;
  content?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceByDay?: string | null;
  recurrenceUntil?: Date | null;
  originalDate?: Date | null;
}

interface LoadedRange {
  start: number;
  end: number;
}

function mergeRanges(ranges: LoadedRange[]): LoadedRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: LoadedRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

export function isRangeCovered(
  loadedRanges: LoadedRange[],
  start: number,
  end: number,
): boolean {
  return loadedRanges.some((r) => r.start <= start && r.end >= end);
}

function rebuildEntries(entryMap: Map<string, CalendarEntry>): CalendarEntry[] {
  return Array.from(entryMap.values());
}

interface CalendarState {
  view: CalendarView;
  currentDate: Date;
  entries: CalendarEntry[];
  entryMap: Map<string, CalendarEntry>;
  loadedRanges: LoadedRange[];
  cacheVersion: number;
  isFetching: boolean;
  isEntryModalOpen: boolean;
  editingEntry: CalendarEntry | null;
  defaultStartDate: Date | null;
  setView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  mergeEntries: (entries: CalendarEntry[]) => void;
  replaceEntries: (entries: CalendarEntry[]) => void;
  addLoadedRange: (start: number, end: number) => void;
  setIsFetching: (isFetching: boolean) => void;
  clearCache: () => void;
  invalidateCache: () => void;
  navigate: (direction: -1 | 1) => void;
  openEntryModal: (entry?: CalendarEntry, defaultStart?: Date) => void;
  closeEntryModal: () => void;
  addEntry: (entry: CalendarEntry) => void;
  updateEntry: (entry: CalendarEntry) => void;
  deleteEntry: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  view: loadStoredValue('view', CalendarView.Month, isCalendarView),
  currentDate: loadStoredDate(),
  entries: [],
  entryMap: new Map(),
  loadedRanges: [],
  cacheVersion: 0,
  isFetching: false,
  isEntryModalOpen: false,
  editingEntry: null,
  defaultStartDate: null,
  setView: (view) => {
    storeValue('view', view);
    set({ view });
  },
  setCurrentDate: (currentDate) => {
    storeValue('currentDate', currentDate.toISOString());
    set({ currentDate });
  },
  mergeEntries: (entries) =>
    set((state) => {
      const newMap = new Map(state.entryMap);
      for (const entry of entries) {
        newMap.set(entry.id, entry);
      }
      return { entryMap: newMap, entries: rebuildEntries(newMap) };
    }),
  replaceEntries: (entries) =>
    set(() => {
      const newMap = new Map<string, CalendarEntry>();
      for (const entry of entries) {
        newMap.set(entry.id, entry);
      }
      return { entryMap: newMap, entries: rebuildEntries(newMap) };
    }),
  addLoadedRange: (start, end) =>
    set((state) => ({
      loadedRanges: mergeRanges([...state.loadedRanges, { start, end }]),
    })),
  setIsFetching: (isFetching) => set({ isFetching }),
  clearCache: () => set({ entryMap: new Map(), entries: [], loadedRanges: [] }),
  invalidateCache: () =>
    set((state) => ({
      loadedRanges: [],
      cacheVersion: state.cacheVersion + 1,
    })),
  navigate: (direction) =>
    set((state) => {
      const currentDate = getAdjacentDate(
        state.currentDate,
        state.view,
        direction,
      );
      storeValue('currentDate', currentDate.toISOString());
      return { currentDate };
    }),
  openEntryModal: (entry, defaultStart) =>
    set({
      isEntryModalOpen: true,
      editingEntry: entry ?? null,
      defaultStartDate: defaultStart ?? null,
    }),
  closeEntryModal: () =>
    set({
      isEntryModalOpen: false,
      editingEntry: null,
      defaultStartDate: null,
    }),
  addEntry: (entry) =>
    set((state) => {
      const newMap = new Map(state.entryMap);
      newMap.set(entry.id, entry);
      return { entryMap: newMap, entries: rebuildEntries(newMap) };
    }),
  updateEntry: (entry) =>
    set((state) => {
      const newMap = new Map(state.entryMap);
      newMap.set(entry.id, entry);
      return { entryMap: newMap, entries: rebuildEntries(newMap) };
    }),
  deleteEntry: (id) =>
    set((state) => {
      const newMap = new Map(state.entryMap);
      newMap.delete(id);
      return { entryMap: newMap, entries: rebuildEntries(newMap) };
    }),
}));
