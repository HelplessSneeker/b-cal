import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  userEvent,
  resetStores,
} from '../../test-utils';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue({ success: false }),
}));

import { logout, deleteUser } from '@/lib/api/auth';
const logoutMock = vi.mocked(logout);
const deleteUserMock = vi.mocked(deleteUser);

beforeEach(() => {
  resetStores();
  mockPush.mockClear();
  logoutMock.mockClear();
  deleteUserMock.mockClear();
  useUserStore.setState({
    user: { id: '1', email: 'alice@example.com', emailVerified: true },
  });
  useCalendarStore.setState({
    view: CalendarView.Day,
    currentDate: new Date(2025, 5, 15),
  });
});

describe('CalendarHeader', () => {
  it('displays user avatar initials from email', () => {
    render(<CalendarHeader />);
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('today button resets date', async () => {
    useCalendarStore.setState({ currentDate: new Date(2020, 0, 1) });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    await user.click(screen.getByRole('button', { name: 'Today' }));

    const state = useCalendarStore.getState();
    const today = new Date();
    expect(state.currentDate.getDate()).toBe(today.getDate());
    expect(state.currentDate.getMonth()).toBe(today.getMonth());
    expect(state.currentDate.getFullYear()).toBe(today.getFullYear());
  });

  it('navigate prev/next changes date by day in Day view', async () => {
    useCalendarStore.setState({
      view: CalendarView.Day,
      currentDate: new Date(2025, 5, 15),
    });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    const buttons = screen.getAllByRole('button');
    // Find the navigation buttons (they have chevron icons)
    const prevBtn = buttons.find((b) =>
      b.querySelector('.lucide-chevron-left'),
    )!;
    const nextBtn = buttons.find((b) =>
      b.querySelector('.lucide-chevron-right'),
    )!;

    await user.click(nextBtn);
    expect(useCalendarStore.getState().currentDate.getDate()).toBe(16);

    await user.click(prevBtn);
    expect(useCalendarStore.getState().currentDate.getDate()).toBe(15);
  });

  it('navigate prev/next changes date by week in Week view', async () => {
    useCalendarStore.setState({
      view: CalendarView.Week,
      currentDate: new Date(2025, 5, 15),
    });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    const nextBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('.lucide-chevron-right'))!;

    await user.click(nextBtn);
    expect(useCalendarStore.getState().currentDate.getDate()).toBe(22);
  });

  it('navigate prev/next changes date by month in Month view', async () => {
    useCalendarStore.setState({
      view: CalendarView.Month,
      currentDate: new Date(2025, 5, 15),
    });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    const nextBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('.lucide-chevron-right'))!;

    await user.click(nextBtn);
    expect(useCalendarStore.getState().currentDate.getMonth()).toBe(6);
  });

  it('view selector switches between Day/Week/Month', async () => {
    const user = userEvent.setup();
    render(<CalendarHeader />);

    // Open the view dropdown (has aria-haspopup="menu")
    const viewTrigger = screen.getByRole('button', { name: /^Day/ });
    await user.click(viewTrigger);

    // Select Week
    await user.click(screen.getByRole('menuitem', { name: 'Week' }));
    expect(useCalendarStore.getState().view).toBe(CalendarView.Week);
  });

  it('logout clears user and redirects to /login', async () => {
    logoutMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CalendarHeader />);

    // Open user dropdown (avatar button)
    const avatarButton = screen.getByText('AE').closest('button')!;
    await user.click(avatarButton);

    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(useUserStore.getState().user).toBeNull();
    });
  });

  it('delete account requires email match, calls API, redirects', async () => {
    deleteUserMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    // Open user dropdown
    const avatarButton = screen.getByText('AE').closest('button')!;
    await user.click(avatarButton);

    await user.click(screen.getByRole('menuitem', { name: 'Delete Account' }));

    // Dialog opens
    await waitFor(() => {
      expect(
        screen.getByText('Delete Account', {
          selector: "[role='heading'], h2",
        }),
      ).toBeInTheDocument();
    });

    // Delete button should be disabled until email matches
    const deleteBtn = screen.getByRole('button', { name: 'Delete Account' });
    expect(deleteBtn).toBeDisabled();

    // Type matching email
    const emailInput = screen.getByPlaceholderText('alice@example.com');
    await user.type(emailInput, 'alice@example.com');

    expect(deleteBtn).toBeEnabled();
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(deleteUserMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(useUserStore.getState().user).toBeNull();
    });
  });
});
