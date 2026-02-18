import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, resetStores } from '../../../test-utils';
import { DayView } from '@/components/calendar/views/day-view';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';

vi.mock('@/components/calendar/current-time-indicator', () => ({
  CurrentTimeIndicator: () => null,
}));

beforeEach(() => {
  resetStores();
});

const currentDate = new Date(2025, 5, 15); // June 15, 2025

const timedEntry: CalendarEntry = {
  id: 'timed-1',
  title: 'Team Standup',
  startDate: new Date(2025, 5, 15, 10, 0),
  endDate: new Date(2025, 5, 15, 10, 30),
  wholeDay: false,
};

const allDayEntry: CalendarEntry = {
  id: 'allday-1',
  title: 'Company Holiday',
  startDate: new Date(2025, 5, 15, 0, 0),
  endDate: new Date(2025, 5, 15, 23, 59),
  wholeDay: true,
};

const otherDayEntry: CalendarEntry = {
  id: 'other-1',
  title: 'Tomorrow Task',
  startDate: new Date(2025, 5, 16, 14, 0),
  endDate: new Date(2025, 5, 16, 15, 0),
  wholeDay: false,
};

describe('DayView', () => {
  it('displays formatted day header', () => {
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<DayView />);
    // German locale format: "Sonntag, 15. Juni 2025"
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
      '15',
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
      'Juni',
    );
  });

  it('shows only entries for the current day', () => {
    useCalendarStore.setState({
      currentDate,
      entries: [timedEntry, otherDayEntry],
    });
    render(<DayView />);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow Task')).not.toBeInTheDocument();
  });

  it('separates all-day entries from timed entries', () => {
    useCalendarStore.setState({
      currentDate,
      entries: [timedEntry, allDayEntry],
    });
    render(<DayView />);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
  });

  it('shows all-day section only when there are all-day entries', () => {
    // No all-day entries
    useCalendarStore.setState({
      currentDate,
      entries: [timedEntry],
    });
    const { unmount } = render(<DayView />);
    // AllDaySection returns null when no entries
    expect(screen.queryByText('Company Holiday')).not.toBeInTheDocument();
    unmount();

    // With all-day entries
    useCalendarStore.setState({
      currentDate,
      entries: [allDayEntry],
    });
    render(<DayView />);
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
  });

  it('clicking a time slot calls openEntryModal with time', async () => {
    const openSpy = vi.fn();
    useCalendarStore.setState({
      currentDate,
      entries: [],
      openEntryModal: openSpy,
    });
    render(<DayView />);

    // 48 time slots rendered
    const slots = document.querySelectorAll("[style*='height: 30px']");
    expect(slots.length).toBeGreaterThan(0);

    // Click first slot (00:00)
    slots[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(openSpy).toHaveBeenCalledWith(undefined, expect.any(Date));
  });

  it('clicking an entry calls openEntryModal with entry', async () => {
    const openSpy = vi.fn();
    useCalendarStore.setState({
      currentDate,
      entries: [timedEntry],
      openEntryModal: openSpy,
    });
    render(<DayView />);

    screen.getByText('Team Standup').click();
    expect(openSpy).toHaveBeenCalledWith(timedEntry);
  });
});
