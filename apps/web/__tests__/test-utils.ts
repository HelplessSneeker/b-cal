import { vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import {
  render as rtlRender,
  screen,
  waitFor,
  within,
  act,
  type RenderOptions,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import common from '@b-cal/i18n/locales/en/common.json';
import auth from '@b-cal/i18n/locales/en/auth.json';
import settings from '@b-cal/i18n/locales/en/settings.json';
import calendar from '@b-cal/i18n/locales/en/calendar.json';
import error from '@b-cal/i18n/locales/en/error.json';

const messages = { common, auth, settings, calendar, error };

function IntlWrapper({ children }: { children: React.ReactNode }) {
  return createElement(
    NextIntlClientProvider,
    { locale: 'en', messages },
    children,
  );
}

function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: IntlWrapper, ...options });
}

export { render, screen, waitFor, within, act, userEvent };

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
    defaultWholeDay: false,
  });
  useConnectionStore.setState({
    consecutiveFailures: 0,
    isBackendDown: false,
    isRetrying: false,
  });
}
