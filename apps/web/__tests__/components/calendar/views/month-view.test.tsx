import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, resetStores } from '../../../test-utils';
import { MonthView } from '@/components/calendar/views/month-view';
import {
  useCalendarStore,
  CalendarView,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useUserStore } from '@/lib/stores/userStore';

beforeEach(() => {
  resetStores();
});

// June 2025
const currentDate = new Date(2025, 5, 15);

function makeEntries(count: number, date: Date): CalendarEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `entry-${i}`,
    title: `Entry ${i + 1}`,
    startDate: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      9 + i,
      0,
    ),
    endDate: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      10 + i,
      0,
    ),
    wholeDay: false,
  }));
}

describe('MonthView', () => {
  it('renders weekday headers', () => {
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<MonthView />);

    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Tu')).toBeInTheDocument();
    expect(screen.getByText('We')).toBeInTheDocument();
    expect(screen.getByText('Th')).toBeInTheDocument();
    expect(screen.getByText('Fr')).toBeInTheDocument();
    expect(screen.getByText('Sa')).toBeInTheDocument();
    expect(screen.getByText('Su')).toBeInTheDocument();
  });

  it('renders 6 week rows', () => {
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<MonthView />);

    const weekRows = document.querySelectorAll(
      '[data-testid="month-week-row"]',
    );
    expect(weekRows).toHaveLength(6);
  });

  it('shows entry previews in date cells', () => {
    const entry: CalendarEntry = {
      id: 'preview-1',
      title: 'June Meeting',
      startDate: new Date(2025, 5, 15, 10, 0),
      endDate: new Date(2025, 5, 15, 11, 0),
      wholeDay: false,
    };
    useCalendarStore.setState({ currentDate, entries: [entry] });
    render(<MonthView />);

    expect(screen.getByText('June Meeting')).toBeInTheDocument();
  });

  it('shows "+N more" indicator when entries overflow', () => {
    // 5 entries on June 15 — 3 visible, 2 hidden
    const entries = makeEntries(5, new Date(2025, 5, 15));
    useCalendarStore.setState({ currentDate, entries });
    render(<MonthView />);

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('clicking "+more" switches to Day view for that date', async () => {
    const entries = makeEntries(5, new Date(2025, 5, 15));
    useCalendarStore.setState({ currentDate, entries });
    render(<MonthView />);

    screen.getByText('+2 more').click();

    const state = useCalendarStore.getState();
    expect(state.view).toBe(CalendarView.Day);
    expect(state.currentDate.getDate()).toBe(15);
  });

  it('clicking empty cell opens entry modal at 9am with wholeDay true', () => {
    const openSpy = vi.fn();
    useCalendarStore.setState({
      currentDate,
      entries: [],
      openEntryModal: openSpy,
    });
    render(<MonthView />);

    screen.getByTestId('month-cell-2025-06-15').click();

    expect(openSpy).toHaveBeenCalledWith(undefined, expect.any(Date), true);
    const passedDate = openSpy.mock.calls[0][1] as Date;
    expect(passedDate.getHours()).toBe(9);
  });

  it('clicking cell with entries does not trigger openEntryModal', () => {
    const openSpy = vi.fn();
    const entry: CalendarEntry = {
      id: 'block-click',
      title: 'Busy Day',
      startDate: new Date(2025, 5, 15, 10, 0),
      endDate: new Date(2025, 5, 15, 11, 0),
      wholeDay: false,
    };
    useCalendarStore.setState({
      currentDate,
      entries: [entry],
      openEntryModal: openSpy,
    });
    render(<MonthView />);

    // Cell with entries has no onClick handler
    screen.getByTestId('month-cell-2025-06-15').click();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('renders weekday headers starting from Sunday when weekStart is sunday', () => {
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
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<MonthView />);

    const headers = document.querySelectorAll(
      '.text-xs.font-medium.uppercase.text-muted-foreground',
    );
    expect(headers[0].textContent).toBe('Su');
    expect(headers[6].textContent).toBe('Sa');
  });

  it('renders whole-day entries as spanning bars', () => {
    const entry: CalendarEntry = {
      id: 'span-1',
      title: 'Multi-Day Event',
      startDate: new Date(2025, 5, 16, 0, 0), // Monday
      endDate: new Date(2025, 5, 18, 23, 59), // Wednesday
      wholeDay: true,
    };
    useCalendarStore.setState({ currentDate, entries: [entry] });
    render(<MonthView />);

    // The entry title should appear once as a spanning bar
    const elements = screen.getAllByText('Multi-Day Event');
    expect(elements).toHaveLength(1);

    // The bar should use grid-column to span 3 columns
    const bar = elements[0].closest('button')!;
    expect(bar.style.gridColumn).toBe('1 / span 3');
  });
});
