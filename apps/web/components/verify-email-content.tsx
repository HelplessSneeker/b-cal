'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { verifyEmail, refreshToken } from '@/lib/api/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export function VerifyEmailContent() {
  const t = useTranslations('auth.verifyEmail');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    verifyEmail(token).then(async (result) => {
      if (result.success) {
        await refreshToken();
        setStatus('success');
        router.push('/');
      } else {
        setStatus('error');
        setErrorMessage(result.error || '');
      }
    });
  }, [token, router]);

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('verifyingTitle')}</CardTitle>
          <CardDescription>{t('verifyingDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('successTitle')}</CardTitle>
          <CardDescription>{t('successDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('failedTitle')}</CardTitle>
        <CardDescription>
          {token ? errorMessage || t('failedDescription') : t('noToken')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href="/login"
          className="rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {tCommon('backToLogin')}
        </a>
      </CardContent>
    </Card>
  );
}
