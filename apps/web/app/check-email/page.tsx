'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getMe, logout, resendVerification } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/api';
import { useUserStore } from '@/lib/stores/userStore';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import { checkHealth } from '@/components/ConnectionGuard';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { AuthLayout } from '@/components/auth-layout';

const RESEND_COOLDOWN_MS = 60_000;

export default function CheckEmailPage() {
  const t = useTranslations('auth.checkEmail');
  const tSuccess = useTranslations('success');
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

    getMe()
      .then((userData) => {
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
      })
      .catch(async (error) => {
        if (error instanceof ApiError && error.status === 0) {
          const healthy = await checkHealth();
          if (!healthy) {
            useConnectionStore.getState().recordFailure();
          }
          setIsLoading(false);
          return;
        }
        router.push('/login');
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
    try {
      await resendVerification();
      setCooldownEnd(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      toast.success(tSuccess('verificationEmailSent'));
    } catch {
      toast.error(t('resendFailed'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      clearCache();
      router.push('/login');
    } catch {
      toast.error(t('logoutFailed'));
    }
  };

  if (isLoading || (user && user.emailVerified)) {
    return <Loading className="h-screen" />;
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t.rich('description', {
              email: () => (
                <span className="break-all font-medium text-foreground">
                  {user?.email}
                </span>
              ),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            variant="outline"
            disabled={resendLoading || cooldownRemaining > 0}
            onClick={handleResend}
          >
            {resendLoading
              ? t('sending')
              : cooldownRemaining > 0
                ? t('resendIn', { seconds: cooldownRemaining })
                : t('resend')}
          </Button>
          <Button variant="link" onClick={handleLogout}>
            {t('logout')}
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
