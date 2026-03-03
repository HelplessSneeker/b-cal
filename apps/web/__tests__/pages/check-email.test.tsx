import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent, resetStores } from '../test-utils';
import CheckEmailPage from '@/app/check-email/page';
import { useUserStore } from '@/lib/stores/userStore';
import { ApiError } from '@/lib/api/api';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api/auth', () => ({
  getMe: vi.fn().mockResolvedValue(null),
  resendVerification: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  updatePreferences: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/ConnectionGuard', () => ({
  checkHealth: vi.fn().mockResolvedValue(false),
  ConnectionGuard: () => null,
}));

import { getMe, resendVerification, logout } from '@/lib/api/auth';
import { checkHealth } from '@/components/ConnectionGuard';
const getMeMock = vi.mocked(getMe);
const resendMock = vi.mocked(resendVerification);
const logoutMock = vi.mocked(logout);
const checkHealthMock = vi.mocked(checkHealth);

beforeEach(() => {
  resetStores();
  mockPush.mockClear();
  getMeMock.mockClear();
  resendMock.mockClear();
  logoutMock.mockClear();
  checkHealthMock.mockReset().mockResolvedValue(false);
});

describe('CheckEmailPage', () => {
  it('shows page with user email when unverified user is in store', () => {
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    render(<CheckEmailPage />);

    expect(screen.getByText('Check your inbox')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('redirects to / when user is verified', async () => {
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    render(<CheckEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('fetches user via getMe when store is empty', async () => {
    getMeMock.mockResolvedValue({
      id: '1',
      email: 'alice@example.com',
      emailVerified: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      preferences: null,
    });
    render(<CheckEmailPage />);

    await waitFor(() => {
      expect(getMeMock).toHaveBeenCalled();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });
  });

  it('redirects to /login when getMe returns null', async () => {
    getMeMock.mockResolvedValue(null);
    render(<CheckEmailPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('resend button calls API and starts 60s cooldown', async () => {
    resendMock.mockResolvedValue({ success: true });
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    const user = userEvent.setup();
    render(<CheckEmailPage />);

    const resendBtn = screen.getByRole('button', {
      name: 'Resend verification email',
    });
    await user.click(resendBtn);

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalled();
    });

    // After click, button should show countdown text
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Resend in \d+s/ }),
      ).toBeDisabled();
    });
  });

  it('button shows countdown text during cooldown', async () => {
    resendMock.mockResolvedValue({ success: true });
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    const user = userEvent.setup();
    render(<CheckEmailPage />);

    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    );

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Resend in \d+s/ });
      expect(btn).toBeDisabled();
    });
  });

  it('logout clears user and redirects to /login', async () => {
    logoutMock.mockResolvedValue(undefined);
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    const user = userEvent.setup();
    render(<CheckEmailPage />);

    await user.click(screen.getByText('Log out'));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(useUserStore.getState().user).toBeNull();
    });
  });

  it('does not redirect to /login on network error (status 0)', async () => {
    getMeMock.mockRejectedValue(new ApiError('Network error', 0));
    render(<CheckEmailPage />);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
