import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent, resetStores } from '../test-utils';
import { ConnectionGuard } from '@/components/ConnectionGuard';
import { useConnectionStore } from '@/lib/stores/connectionStore';

const mockFetch = vi.fn();

beforeEach(() => {
  resetStores();
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ConnectionGuard', () => {
  it('renders nothing when backend is not down', () => {
    const { container } = render(<ConnectionGuard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders overlay when backend is down', () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    render(<ConnectionGuard />);
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Unable to connect to the server. Please check your connection and try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('retry button calls health endpoint and stays down on failure', async () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConnectionGuard />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object),
      );
    });

    // Should still be down
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
  });

  it('retry button triggers recovery on healthy response', async () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConnectionGuard />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(useConnectionStore.getState().isBackendDown).toBe(false);
    });
  });

  it('shows spinner while retrying', async () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    // Never resolves to keep isRetrying true
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConnectionGuard />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(
        screen.getByRole('status', { name: 'Loading' }),
      ).toBeInTheDocument();
    });
  });

  it('auto-checks health every 10 seconds while down', async () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ConnectionGuard />);

    // Advance past first interval
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past second interval
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('auto-recovery triggers recordSuccess on healthy response', async () => {
    useConnectionStore.setState({
      consecutiveFailures: 2,
      isBackendDown: true,
    });
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

    render(<ConnectionGuard />);

    await vi.advanceTimersByTimeAsync(10_000);

    await waitFor(() => {
      expect(useConnectionStore.getState().isBackendDown).toBe(false);
    });
  });
});
