import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, resetStores } from '../test-utils';
import { AuthProvider } from '@/components/AuthProvider';
import { useUserStore } from '@/lib/stores/userStore';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import { ApiError } from '@/lib/api/api';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api/auth', () => ({
  getMe: vi.fn().mockResolvedValue(null),
  updatePreferences: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/ConnectionGuard', () => ({
  checkHealth: vi.fn().mockResolvedValue(false),
  ConnectionGuard: () => null,
}));

import { getMe } from '@/lib/api/auth';
import { checkHealth } from '@/components/ConnectionGuard';
const getMeMock = vi.mocked(getMe);
const checkHealthMock = vi.mocked(checkHealth);

beforeEach(() => {
  resetStores();
  mockPush.mockClear();
  getMeMock.mockReset().mockResolvedValue(null);
  checkHealthMock.mockReset().mockResolvedValue(false);
});

describe('AuthProvider', () => {
  it('shows skeleton while checking auth', () => {
    getMeMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when user is verified', () => {
    useUserStore.setState({
      user: {
        id: '1',
        email: 'alice@example.com',
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        preferences: null,
      },
    });
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('redirects to /check-email when getMe returns unverified user', async () => {
    getMeMock.mockResolvedValue({
      id: '1',
      email: 'alice@example.com',
      emailVerified: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      preferences: null,
    });
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/check-email');
    });
  });

  it('redirects to /login when getMe returns null', async () => {
    getMeMock.mockResolvedValue(null);
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('does not redirect to /login on network error (status 0)', async () => {
    getMeMock.mockRejectedValue(new ApiError('Network error', 0));
    checkHealthMock.mockResolvedValue(false);
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('records second failure via health check on network error', async () => {
    getMeMock.mockRejectedValue(new ApiError('Network error', 0));
    checkHealthMock.mockResolvedValue(false);
    // Simulate the first failure already recorded by api()
    useConnectionStore.setState({ consecutiveFailures: 1 });

    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(checkHealthMock).toHaveBeenCalled();
      expect(useConnectionStore.getState().consecutiveFailures).toBe(2);
      expect(useConnectionStore.getState().isBackendDown).toBe(true);
    });
  });

  it('does not record failure when health check succeeds', async () => {
    getMeMock.mockRejectedValue(new ApiError('Network error', 0));
    checkHealthMock.mockResolvedValue(true);
    useConnectionStore.setState({ consecutiveFailures: 1 });

    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(checkHealthMock).toHaveBeenCalled();
      // Health came back OK, so no second failure recorded
      expect(useConnectionStore.getState().consecutiveFailures).toBe(1);
      expect(useConnectionStore.getState().isBackendDown).toBe(false);
    });
  });

  it('redirects to /login on non-network ApiError', async () => {
    getMeMock.mockRejectedValue(new ApiError('Server error', 500));
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
