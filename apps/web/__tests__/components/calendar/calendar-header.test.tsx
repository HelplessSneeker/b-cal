import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  within,
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
}));

import { logout } from '@/lib/api/auth';
const logoutMock = vi.mocked(logout);

beforeEach(() => {
  resetStores();
  mockPush.mockClear();
  logoutMock.mockClear();
  useUserStore.setState({
    user: {
      id: '1',
      email: 'alice@example.com',
      emailVerified: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      preferences: null,
    },
  });
  useCalendarStore.setState({
    view: CalendarView.Day,
    currentDate: new Date(2025, 5, 15),
  });
});

function getDesktopHeader() {
  return within(screen.getByTestId('desktop-header'));
}

function getMobileHeader() {
  return within(screen.getByTestId('mobile-header'));
}

describe('CalendarHeader', () => {
  it('displays user avatar initials from email', () => {
    render(<CalendarHeader />);
    expect(screen.getByText('AE')).toBeInTheDocument();
  });

  it('today button resets date', async () => {
    useCalendarStore.setState({ currentDate: new Date(2020, 0, 1) });
    const user = userEvent.setup();
    render(<CalendarHeader />);

    const desktop = getDesktopHeader();
    await user.click(desktop.getByRole('button', { name: 'Today' }));

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

    const desktop = getDesktopHeader();
    const buttons = desktop.getAllByRole('button');
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

    const desktop = getDesktopHeader();
    const nextBtn = desktop
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

    const desktop = getDesktopHeader();
    const nextBtn = desktop
      .getAllByRole('button')
      .find((b) => b.querySelector('.lucide-chevron-right'))!;

    await user.click(nextBtn);
    expect(useCalendarStore.getState().currentDate.getMonth()).toBe(6);
  });

  it('view selector switches between Day/Week/Month', async () => {
    const user = userEvent.setup();
    render(<CalendarHeader />);

    const desktop = getDesktopHeader();
    const viewTrigger = desktop.getByRole('button', { name: /^Day/ });
    await user.click(viewTrigger);

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

  describe('mobile header', () => {
    it('hamburger opens drawer with mini calendar', async () => {
      const user = userEvent.setup();
      render(<CalendarHeader />);

      const mobile = getMobileHeader();
      await user.click(mobile.getByRole('button', { name: 'Open menu' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByText('Calendar')).toBeInTheDocument();
    });

    it('mobile today button navigates to today', async () => {
      useCalendarStore.setState({ currentDate: new Date(2020, 0, 1) });
      const user = userEvent.setup();
      render(<CalendarHeader />);

      const mobile = getMobileHeader();
      await user.click(mobile.getByRole('button', { name: 'Go to today' }));

      const state = useCalendarStore.getState();
      const today = new Date();
      expect(state.currentDate.getDate()).toBe(today.getDate());
      expect(state.currentDate.getMonth()).toBe(today.getMonth());
      expect(state.currentDate.getFullYear()).toBe(today.getFullYear());
    });

    it('mobile nav buttons change date', async () => {
      useCalendarStore.setState({
        view: CalendarView.Day,
        currentDate: new Date(2025, 5, 15),
      });
      const user = userEvent.setup();
      render(<CalendarHeader />);

      const mobile = getMobileHeader();
      await user.click(mobile.getByRole('button', { name: 'Next' }));
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(16);

      await user.click(mobile.getByRole('button', { name: 'Previous' }));
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(15);
    });
  });
});
