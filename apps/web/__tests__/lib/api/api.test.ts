import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, fetchCsrfToken } from '@/lib/api/api';
import { useConnectionStore } from '@/lib/stores/connectionStore';

const BACKEND_URL = 'http://localhost:3000';

// Suppress toast calls
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('api() token refresh', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    useConnectionStore.setState({
      consecutiveFailures: 0,
      isBackendDown: false,
      isRetrying: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(status: number, body: object) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('retries with refresh on 401 and succeeds', async () => {
    mockFetch
      // 1st call: original request → 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      // 2nd call: refresh → 200
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Tokens refreshed' }))
      // 3rd call: CSRF token fetch after refresh
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { csrfToken: 'new-csrf' } }),
      )
      // 4th call: retry original → 200
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { id: '1' }, message: '' }),
      );

    const result = await api('/calendar', { showSuccessToast: false });

    expect(result).toEqual({ id: '1' });
    expect(mockFetch).toHaveBeenCalledTimes(4);

    // Verify the refresh call was made to the right endpoint
    expect(mockFetch.mock.calls[1][0]).toBe(`${BACKEND_URL}/auth/refresh`);
    expect(mockFetch.mock.calls[1][1].method).toBe('POST');

    // Verify CSRF token was re-fetched after refresh
    expect(mockFetch.mock.calls[2][0]).toBe(`${BACKEND_URL}/auth/csrf-token`);

    // Verify the retry was made to the original endpoint
    expect(mockFetch.mock.calls[3][0]).toBe(`${BACKEND_URL}/calendar`);
  });

  it('redirects to /login when refresh fails', async () => {
    // Mock window.location
    const locationSpy = { href: '' };
    vi.stubGlobal('location', locationSpy);

    mockFetch
      // 1st call: original request → 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      // 2nd call: refresh → 401 (refresh token also expired)
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }));

    await expect(api('/calendar')).rejects.toThrow(ApiError);
    expect(locationSpy.href).toBe('/login');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('redirects to /login when refresh succeeds but retry still 401', async () => {
    const locationSpy = { href: '' };
    vi.stubGlobal('location', locationSpy);

    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      // refresh succeeds
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Tokens refreshed' }))
      // CSRF token fetch after refresh
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { csrfToken: 'new-csrf' } }),
      )
      // retry still 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }));

    await expect(api('/calendar')).rejects.toThrow(ApiError);
    expect(locationSpy.href).toBe('/login');
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('does NOT attempt refresh for /auth/refresh endpoint', async () => {
    const locationSpy = { href: '' };
    vi.stubGlobal('location', locationSpy);

    mockFetch.mockResolvedValueOnce(
      jsonResponse(401, { message: 'Unauthorized' }),
    );

    await expect(
      api('/auth/refresh', { method: 'POST', showSuccessToast: false }),
    ).rejects.toThrow(ApiError);

    // Only 1 call — no refresh attempt
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // No redirect either — let the caller handle it
    expect(locationSpy.href).toBe('');
  });

  it('deduplicates concurrent refresh attempts', async () => {
    let refreshCallCount = 0;

    mockFetch.mockImplementation((url: string) => {
      if (url === `${BACKEND_URL}/auth/refresh`) {
        refreshCallCount++;
        return Promise.resolve(
          jsonResponse(200, { message: 'Tokens refreshed' }),
        );
      }
      // First two calls are the original requests (401),
      // later calls are the retries (200)
      if (refreshCallCount === 0) {
        return Promise.resolve(jsonResponse(401, { message: 'Unauthorized' }));
      }
      return Promise.resolve(
        jsonResponse(200, { data: { ok: true }, message: '' }),
      );
    });

    const [r1, r2] = await Promise.all([
      api('/calendar', { showSuccessToast: false }),
      api('/entries', { showSuccessToast: false }),
    ]);

    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    // Only 1 refresh call despite 2 concurrent 401s
    expect(refreshCallCount).toBe(1);
  });

  it('does NOT attempt refresh for /auth/login endpoint', async () => {
    const locationSpy = { href: '' };
    vi.stubGlobal('location', locationSpy);

    mockFetch.mockResolvedValueOnce(
      jsonResponse(401, { message: 'Invalid credentials' }),
    );

    await expect(
      api('/auth/login', {
        method: 'POST',
        body: { email: 'a', password: 'b' },
      }),
    ).rejects.toThrow(ApiError);

    // Only 1 call — no refresh attempt, no redirect
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(locationSpy.href).toBe('');
  });

  it('includes CSRF token in refresh request when available', async () => {
    // Seed the CSRF token by mocking a successful fetch
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, { data: { csrfToken: 'test-csrf-token' } }),
    );
    await fetchCsrfToken();

    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Tokens refreshed' }))
      // CSRF token fetch after refresh
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { csrfToken: 'refreshed-csrf-token' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { id: '1' }, message: '' }),
      );

    await api('/calendar', { showSuccessToast: false });

    // Check that the refresh call included the CSRF token
    const refreshCall = mockFetch.mock.calls.find(
      (call) => call[0] === `${BACKEND_URL}/auth/refresh`,
    );
    expect(refreshCall[1].headers['x-csrf-token']).toBe('test-csrf-token');
  });
});

describe('api() connection tracking', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    useConnectionStore.setState({
      consecutiveFailures: 0,
      isBackendDown: false,
      isRetrying: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(status: number, body: object) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('records success on successful response', async () => {
    // Simulate prior failure
    useConnectionStore.setState({ consecutiveFailures: 1 });

    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, { data: { id: '1' }, message: '' }),
    );

    await api('/calendar', { showSuccessToast: false });

    expect(useConnectionStore.getState().consecutiveFailures).toBe(0);
  });

  it('records failure on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api('/calendar')).rejects.toThrow(ApiError);

    expect(useConnectionStore.getState().consecutiveFailures).toBe(1);
  });

  it('sets isBackendDown after 2 network errors', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api('/endpoint1')).rejects.toThrow(ApiError);
    await expect(api('/endpoint2')).rejects.toThrow(ApiError);

    expect(useConnectionStore.getState().isBackendDown).toBe(true);
  });

  it('suppresses toast when backend is already down', async () => {
    const { toast } = await import('sonner');
    const errorSpy = vi.mocked(toast.error);
    errorSpy.mockClear();

    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    // First two failures trigger isBackendDown
    await expect(api('/endpoint1')).rejects.toThrow(ApiError);
    await expect(api('/endpoint2')).rejects.toThrow(ApiError);
    errorSpy.mockClear();

    // Third failure should suppress toast
    await expect(api('/endpoint3')).rejects.toThrow(ApiError);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
