import { create } from 'zustand';

const FAILURE_THRESHOLD = 2;

interface ConnectionState {
  consecutiveFailures: number;
  isBackendDown: boolean;
  isRetrying: boolean;
  recordFailure: () => void;
  recordSuccess: () => void;
  setRetrying: (isRetrying: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  consecutiveFailures: 0,
  isBackendDown: false,
  isRetrying: false,
  recordFailure: () =>
    set((state) => {
      const consecutiveFailures = state.consecutiveFailures + 1;
      return {
        consecutiveFailures,
        isBackendDown: consecutiveFailures >= FAILURE_THRESHOLD,
      };
    }),
  recordSuccess: () =>
    set({ consecutiveFailures: 0, isBackendDown: false, isRetrying: false }),
  setRetrying: (isRetrying) => set({ isRetrying }),
}));
