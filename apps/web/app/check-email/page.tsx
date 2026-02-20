'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logout, resendVerification } from '@/lib/api/auth';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';

const RESEND_COOLDOWN_MS = 60_000;

export default function CheckEmailPage() {
  const router = useRouter();
  const { user, setUser, clearUser } = useUserStore();
  const { clearCache } = useCalendarStore();
  const [isLoading, setIsLoading] = useState(!user);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));

  useEffect(() => {
    if (user) {
      if (user.emailVerified) {
        router.push('/');
      }
      return;
    }

    getMe().then((userData) => {
      if (userData) {
        if (userData.emailVerified) {
          router.push('/');
          return;
        }
        setUser(userData);
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });
  }, [user, setUser, router]);

  useEffect(() => {
    if (cooldownEnd <= Date.now()) return;

    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownEnd) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleResend = async () => {
    setResendLoading(true);
    await resendVerification();
    setResendLoading(false);
    setCooldownEnd(Date.now() + RESEND_COOLDOWN_MS);
    setNow(Date.now());
  };

  const handleLogout = async () => {
    await logout();
    clearUser();
    clearCache();
    router.push('/login');
  };

  if (isLoading || (user && user.emailVerified)) {
    return <Loading className="h-screen" />;
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a verification link to{' '}
              <span className="font-medium text-foreground">{user?.email}</span>
              . Please click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              variant="outline"
              disabled={resendLoading || cooldownRemaining > 0}
              onClick={handleResend}
            >
              {resendLoading
                ? 'Sending...'
                : cooldownRemaining > 0
                  ? `Resend in ${cooldownRemaining}s`
                  : 'Resend verification email'}
            </Button>
            <button
              onClick={handleLogout}
              className="text-center text-sm underline-offset-4 hover:underline"
            >
              Log out
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
