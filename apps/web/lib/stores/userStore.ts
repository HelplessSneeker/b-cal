import { create } from 'zustand';

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: string;
  accentColor: string;
  weekStart: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  preferences: UserPreferences | null;
}

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
