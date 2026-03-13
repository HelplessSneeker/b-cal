import { create } from 'zustand';
import type { CalendarDTO } from '@/lib/api/calendars';

const STORAGE_KEY = 'b-cal:hiddenCalendarIds';
export const DEFAULT_CALENDAR_ID = '__default__';

function loadHiddenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
    return new Set();
  } catch {
    return new Set();
  }
}

function storeHiddenIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable
  }
}

function buildMap(calendars: CalendarDTO[]): Map<string, CalendarDTO> {
  const map = new Map<string, CalendarDTO>();
  for (const cal of calendars) {
    map.set(cal.id, cal);
  }
  return map;
}

interface CalendarsState {
  calendars: CalendarDTO[];
  calendarsMap: Map<string, CalendarDTO>;
  hiddenCalendarIds: Set<string>;
  isLoaded: boolean;
  setCalendars: (calendars: CalendarDTO[]) => void;
  addCalendar: (calendar: CalendarDTO) => void;
  updateCalendar: (calendar: CalendarDTO) => void;
  removeCalendar: (id: string) => void;
  toggleVisibility: (id: string) => void;
}

export const useCalendarsStore = create<CalendarsState>((set) => ({
  calendars: [],
  calendarsMap: new Map(),
  hiddenCalendarIds: loadHiddenIds(),
  isLoaded: false,
  setCalendars: (calendars) =>
    set({ calendars, calendarsMap: buildMap(calendars), isLoaded: true }),
  addCalendar: (calendar) =>
    set((state) => {
      const calendars = [...state.calendars, calendar];
      return { calendars, calendarsMap: buildMap(calendars) };
    }),
  updateCalendar: (calendar) =>
    set((state) => {
      const calendars = state.calendars.map((c) =>
        c.id === calendar.id ? calendar : c,
      );
      return { calendars, calendarsMap: buildMap(calendars) };
    }),
  removeCalendar: (id) =>
    set((state) => {
      const calendars = state.calendars.filter((c) => c.id !== id);
      const hiddenCalendarIds = new Set(state.hiddenCalendarIds);
      hiddenCalendarIds.delete(id);
      storeHiddenIds(hiddenCalendarIds);
      return {
        calendars,
        calendarsMap: buildMap(calendars),
        hiddenCalendarIds,
      };
    }),
  toggleVisibility: (id) =>
    set((state) => {
      const hiddenCalendarIds = new Set(state.hiddenCalendarIds);
      if (hiddenCalendarIds.has(id)) {
        hiddenCalendarIds.delete(id);
      } else {
        hiddenCalendarIds.add(id);
      }
      storeHiddenIds(hiddenCalendarIds);
      return { hiddenCalendarIds };
    }),
}));
