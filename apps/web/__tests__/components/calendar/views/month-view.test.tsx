import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, resetStores } from '../../../test-utils';
import { MonthView } from '@/components/calendar/views/month-view';
import {
  useCalendarStore,
  CalendarView,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';

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
    expect(screen.getByText('Di')).toBeInTheDocument();
    expect(screen.getByText('Mi')).toBeInTheDocument();
    expect(screen.getByText('Do')).toBeInTheDocument();
    expect(screen.getByText('Fr')).toBeInTheDocument();
    expect(screen.getByText('Sa')).toBeInTheDocument();
    expect(screen.getByText('So')).toBeInTheDocument();
  });

  it('renders 42 date cells (6 rows x 7 columns)', () => {
    useCalendarStore.setState({ currentDate, entries: [] });
    render(<MonthView />);

    // 42 cells, each showing a day number
    const grid = document.querySelector('.grid-rows-6');
    expect(grid).toBeInTheDocument();
    expect(grid!.children).toHaveLength(42);
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

    expect(screen.getByText('+2 weitere')).toBeInTheDocument();
  });

  it('clicking "+more" switches to Day view for that date', async () => {
    const entries = makeEntries(5, new Date(2025, 5, 15));
    useCalendarStore.setState({ currentDate, entries });
    render(<MonthView />);

    screen.getByText('+2 weitere').click();

    const state = useCalendarStore.getState();
    expect(state.view).toBe(CalendarView.Day);
    expect(state.currentDate.getDate()).toBe(15);
  });

  it('clicking empty cell opens entry modal at 9am', () => {
    const openSpy = vi.fn();
    useCalendarStore.setState({
      currentDate,
      entries: [],
      openEntryModal: openSpy,
    });
    render(<MonthView />);

    // Click the cell for June 15
    const grid = document.querySelector('.grid-rows-6')!;
    // Find the cell with 15 in it
    const cells = Array.from(grid.children);
    const cell15 = cells.find(
      (cell) => cell.querySelector('span')?.textContent === '15',
    );
    cell15!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(openSpy).toHaveBeenCalledWith(undefined, expect.any(Date));
    const passedDate = openSpy.mock.calls[0][1] as Date;
    expect(passedDate.getHours()).toBe(9);
  });
});
