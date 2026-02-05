import { create } from "zustand"

export enum CalendarView {
  Day = "Day",
  Week = "Week",
  Month = "Month",
}

export interface CalendarEntry {
  id: string;
  startDate: Date
  endDate: Date
  title: string
  wholeDay: boolean
  content?: string
}

interface CalendarState {
  view: CalendarView
  currentDate: Date
  entries: CalendarEntry[]
  isEntryModalOpen: boolean
  editingEntry: CalendarEntry | null
  defaultStartDate: Date | null
  setView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  setEntries: (entries: CalendarEntry[]) => void
  openEntryModal: (entry?: CalendarEntry, defaultStart?: Date) => void
  closeEntryModal: () => void
  addEntry: (entry: CalendarEntry) => void
  updateEntry: (entry: CalendarEntry) => void
  deleteEntry: (id: string) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  view: CalendarView.Month,
  currentDate: new Date(),
  entries: [],
  isEntryModalOpen: false,
  editingEntry: null,
  defaultStartDate: null,
  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setEntries: (entries) => set({ entries }),
  openEntryModal: (entry, defaultStart) =>
    set({
      isEntryModalOpen: true,
      editingEntry: entry ?? null,
      defaultStartDate: defaultStart ?? null,
    }),
  closeEntryModal: () =>
    set({ isEntryModalOpen: false, editingEntry: null, defaultStartDate: null }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  updateEntry: (entry) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
    })),
  deleteEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
}))
