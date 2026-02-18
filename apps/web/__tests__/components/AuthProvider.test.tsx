import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, resetStores } from '../test-utils';
import { AuthProvider } from '@/components/AuthProvider';
import { useUserStore } from '@/lib/stores/userStore';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api/auth', () => ({
  getMe: vi.fn().mockResolvedValue(null),
}));

import { getMe } from '@/lib/api/auth';
const getMeMock = vi.mocked(getMe);

beforeEach(() => {
  resetStores();
  mockPush.mockClear();
  getMeMock.mockReset().mockResolvedValue(null);
});

describe('AuthProvider', () => {
  it('shows loading while checking auth', () => {
    getMeMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <AuthProvider>
        <div>Protected</div>
      </AuthProvider>,
    );
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when user is verified', () => {
    useUserStore.setState({
      user: { id: '1', email: 'alice@example.com', emailVerified: true },
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
});
