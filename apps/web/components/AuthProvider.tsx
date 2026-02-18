'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/lib/api/auth';
import { fetchCsrfToken } from '@/lib/api/api';
import { useUserStore } from '@/lib/stores/userStore';
import { Loading } from '@/components/ui/loading';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (user || hasChecked) return;

    let cancelled = false;

    fetchCsrfToken();

    getMe().then((userData) => {
      if (cancelled) return;

      if (userData) {
        if (!userData.emailVerified) {
          router.push('/check-email');
          return;
        }
        setUser(userData);
      } else {
        // Token was invalid/expired - proxy didn't catch it
        router.push('/login');
      }
      setHasChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, hasChecked, setUser, router]);

  if (user) {
    return <>{children}</>;
  }

  if (!hasChecked) {
    return <Loading className="h-screen" />;
  }

  return null;
}
