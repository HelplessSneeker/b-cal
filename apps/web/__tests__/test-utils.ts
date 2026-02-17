import { vi } from 'vitest';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';

export { render, screen, waitFor, within, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

export function mockRouter() {
  return {
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };
}

export function mockSearchParams(params: Record<string, string> = {}) {
  return {
    get: (key: string) => params[key] ?? null,
    getAll: (key: string) => (params[key] ? [params[key]] : []),
    has: (key: string) => key in params,
    toString: () => new URLSearchParams(params).toString(),
    entries: () => new URLSearchParams(params).entries(),
    forEach: (fn: (value: string, key: string) => void) =>
      new URLSearchParams(params).forEach(fn),
    keys: () => new URLSearchParams(params).keys(),
    values: () => new URLSearchParams(params).values(),
    [Symbol.iterator]: () => new URLSearchParams(params)[Symbol.iterator](),
    size: Object.keys(params).length,
    append: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    sort: vi.fn(),
  };
}

export function resetStores() {
  useUserStore.setState({ user: null });
  useCalendarStore.setState({
    view: CalendarView.Month,
    currentDate: new Date(),
    entries: [],
    entryMap: new Map(),
    loadedRanges: [],
    isFetching: false,
    isEntryModalOpen: false,
    editingEntry: null,
    defaultStartDate: null,
  });
}
