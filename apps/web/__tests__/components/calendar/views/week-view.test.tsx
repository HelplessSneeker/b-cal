import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, resetStores } from '../../../test-utils';
import { WeekView } from '@/components/calendar/views/week-view';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useUserStore } from '@/lib/stores/userStore';

vi.mock('@/components/calendar/current-time-indicator', () => ({
  CurrentTimeIndicator: () => null,
}));

beforeEach(() => {
  resetStores();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// June 18, 2025 is a Wednesday
const currentDate = new Date(2025, 5, 18);

const wednesdayEntry: CalendarEntry = {
  id: 'wed-1',
  title: 'Wednesday Meeting',
  startDate: new Date(2025, 5, 18, 14, 0),
  endDate: new Date(2025, 5, 18, 15, 0),
  wholeDay: false,
};

const allDayEntry: CalendarEntry = {
  id: 'allday-1',
  title: 'Team Offsite',
  startDate: new Date(2025, 5, 16, 0, 0), // Monday
  endDate: new Date(2025, 5, 16, 23, 59),
  wholeDay: true,
};

describe('WeekView', () => {
  it('renders 7 day headers starting from Monday', () => {
    useUserStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '',
        preferences: {
          language: 'de-DE',
          timezone: 'Europe/Vienna',
          theme: 'system',
          accentColor: 'blue',
          weekStart: 'monday',
        },
      },
    });
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<WeekView />);

    // German short weekday names (format varies by Node/ICU version)
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    for (const day of weekdays) {
      expect(
        screen.getByText((content) => content.startsWith(day)),
      ).toBeInTheDocument();
    }
  });

  it('renders week starting from Sunday when weekStart is sunday', () => {
    useUserStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: '',
        preferences: {
          language: 'en-US',
          timezone: 'America/New_York',
          theme: 'system',
          accentColor: 'blue',
          weekStart: 'sunday',
        },
      },
    });
    // June 18, 2025 is a Wednesday — week starting Sunday = June 15
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<WeekView />);

    const headers = document.querySelectorAll(
      '.text-xs.uppercase.text-muted-foreground',
    );
    // First header should be Sun
    expect(headers[0].textContent).toMatch(/^Sun/);
    // Last header should be Sat
    expect(headers[6].textContent).toMatch(/^Sat/);
  });

  it('shows timed entries in correct day column', () => {
    useCalendarStore.setState({
      currentDate,
      entries: [wednesdayEntry],
    });
    render(<WeekView />);
    expect(screen.getByText('Wednesday Meeting')).toBeInTheDocument();
  });

  it('shows all-day entries in the all-day row', () => {
    useCalendarStore.setState({
      currentDate,
      entries: [allDayEntry],
    });
    render(<WeekView />);
    expect(screen.getByText('all-day')).toBeInTheDocument();
    expect(screen.getByText('Team Offsite')).toBeInTheDocument();
  });

  it("highlights today's date", () => {
    // Set currentDate to a week containing today
    const today = new Date();
    useCalendarStore.setState({ currentDate: today, entries: [] });
    render(<WeekView />);

    const todayNumber = today.getDate().toString();
    const todayEl = screen.getByText(todayNumber, {
      selector: '.bg-primary',
    });
    expect(todayEl).toBeInTheDocument();
  });

  it('renders multi-day all-day entry as a spanning bar', () => {
    const multiDayEntry: CalendarEntry = {
      id: 'multi-1',
      title: 'Team Retreat',
      // Monday to Wednesday of the same week
      startDate: new Date(2025, 5, 16, 0, 0),
      endDate: new Date(2025, 5, 18, 23, 59),
      wholeDay: true,
    };

    useCalendarStore.setState({
      currentDate,
      entries: [multiDayEntry],
    });
    render(<WeekView />);

    // The entry title should appear exactly once (as a spanning bar)
    const elements = screen.getAllByText('Team Retreat');
    expect(elements).toHaveLength(1);

    // The bar should use grid-column to span 3 columns
    const bar = elements[0].closest('button')!;
    expect(bar.style.gridColumn).toBe('1 / span 3');
  });
});
