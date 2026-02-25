import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '@/lib/stores/connectionStore';

beforeEach(() => {
  useConnectionStore.setState({
    consecutiveFailures: 0,
    isBackendDown: false,
    isRetrying: false,
  });
});

describe('connectionStore', () => {
  it('starts with zero failures and not down', () => {
    const state = useConnectionStore.getState();
    expect(state.consecutiveFailures).toBe(0);
    expect(state.isBackendDown).toBe(false);
    expect(state.isRetrying).toBe(false);
  });

  it('increments failures on recordFailure', () => {
    useConnectionStore.getState().recordFailure();
    expect(useConnectionStore.getState().consecutiveFailures).toBe(1);
    expect(useConnectionStore.getState().isBackendDown).toBe(false);
  });

  it('sets isBackendDown after 2 consecutive failures', () => {
    useConnectionStore.getState().recordFailure();
    useConnectionStore.getState().recordFailure();
    expect(useConnectionStore.getState().consecutiveFailures).toBe(2);
    expect(useConnectionStore.getState().isBackendDown).toBe(true);
  });

  it('resets on recordSuccess', () => {
    useConnectionStore.getState().recordFailure();
    useConnectionStore.getState().recordFailure();
    expect(useConnectionStore.getState().isBackendDown).toBe(true);

    useConnectionStore.getState().recordSuccess();
    expect(useConnectionStore.getState().consecutiveFailures).toBe(0);
    expect(useConnectionStore.getState().isBackendDown).toBe(false);
  });

  it('recordSuccess clears isRetrying', () => {
    useConnectionStore.getState().setRetrying(true);
    expect(useConnectionStore.getState().isRetrying).toBe(true);

    useConnectionStore.getState().recordSuccess();
    expect(useConnectionStore.getState().isRetrying).toBe(false);
  });

  it('setRetrying updates isRetrying', () => {
    useConnectionStore.getState().setRetrying(true);
    expect(useConnectionStore.getState().isRetrying).toBe(true);

    useConnectionStore.getState().setRetrying(false);
    expect(useConnectionStore.getState().isRetrying).toBe(false);
  });

  it('stays down with more than 2 failures', () => {
    for (let i = 0; i < 5; i++) {
      useConnectionStore.getState().recordFailure();
    }
    expect(useConnectionStore.getState().consecutiveFailures).toBe(5);
    expect(useConnectionStore.getState().isBackendDown).toBe(true);
  });

  it('single failure after success does not set down', () => {
    useConnectionStore.getState().recordFailure();
    useConnectionStore.getState().recordFailure();
    useConnectionStore.getState().recordSuccess();
    useConnectionStore.getState().recordFailure();
    expect(useConnectionStore.getState().consecutiveFailures).toBe(1);
    expect(useConnectionStore.getState().isBackendDown).toBe(false);
  });
});
