'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, updatePreferences } from '@/lib/api/auth';
import { fetchCsrfToken, ApiError } from '@/lib/api/api';
import { useUserStore } from '@/lib/stores/userStore';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import { checkHealth } from '@/components/ConnectionGuard';
import { AppShellSkeleton } from '@/components/app-shell-skeleton';
import { setLocaleCookie } from '@/src/i18n/locale-cookie';
import { useTheme } from 'next-themes';
import { applyAccentColor } from '@/lib/utils/accent-color';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const { setTheme } = useTheme();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (user || hasChecked) return;

    let cancelled = false;

    fetchCsrfToken()
      .then(() => getMe())
      .then((userData) => {
        if (cancelled) return;

        if (userData) {
          if (!userData.emailVerified) {
            setHasChecked(true);
            router.push('/check-email');
            return;
          }
          setUser(userData);

          if (userData.preferences?.language) {
            setLocaleCookie(userData.preferences.language);
          }

          if (userData.preferences?.theme) {
            setTheme(userData.preferences.theme);
          }

          if (userData.preferences?.accentColor) {
            applyAccentColor(userData.preferences.accentColor);
          }

          if (!userData.preferences) {
            const language = navigator.language || 'en-US';
            const timezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              'Europe/London';
            updatePreferences({ language, timezone })
              .then((prefs) => {
                if (!cancelled && prefs) {
                  useUserStore
                    .getState()
                    .setUser({ ...userData, preferences: prefs });
                  if (prefs.language) {
                    setLocaleCookie(prefs.language);
                  }
                }
              })
              .catch(() => {
                // Fire-and-forget — retries on next page load
              });
          }
        } else {
          // Token was invalid/expired - proxy didn't catch it
          router.push('/login');
        }
        setHasChecked(true);
      })
      .catch(async (error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 0) {
          // Confirm the backend is truly down with a health check.
          // getMe() already recorded 1 failure via api(); if health
          // also fails, recordFailure() brings us to 2 → isBackendDown.
          const healthy = await checkHealth();
          if (cancelled) return;
          if (!healthy) {
            useConnectionStore.getState().recordFailure();
          }
          setHasChecked(true);
          return;
        }
        router.push('/login');
        setHasChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, hasChecked, setUser, setTheme, router]);

  if (user) {
    return <>{children}</>;
  }

  if (!hasChecked) {
    return <AppShellSkeleton />;
  }

  return null;
}
