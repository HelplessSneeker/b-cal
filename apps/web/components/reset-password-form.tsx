'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { resetPassword } from '@/lib/api/auth';
import { validatePassword } from '@/lib/utils/password';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import { Spinner } from '@/components/ui/spinner';

export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('auth.validation');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('invalidTitle')}</CardTitle>
          <CardDescription>{t('invalidDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/forgot-password"
            className="rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            {t('requestNew')}
          </a>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const passwordError = validatePassword(password, tAuth);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = tValidation('passwordsDoNotMatch');
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      router.push('/login');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
              <PasswordInput
                id="password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                aria-invalid={!!errors.password || undefined}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
              />
              {password && <PasswordStrengthIndicator password={password} />}
              <FieldError id="password-error">{errors.password}</FieldError>
            </Field>
            <Field data-invalid={!!errors.confirmPassword || undefined}>
              <FieldLabel htmlFor="confirm-password">
                {t('confirmPassword')}
              </FieldLabel>
              <PasswordInput
                id="confirm-password"
                required
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                aria-invalid={!!errors.confirmPassword || undefined}
                aria-describedby={
                  errors.confirmPassword ? 'confirm-password-error' : undefined
                }
              />
              <FieldError id="confirm-password-error">
                {errors.confirmPassword}
              </FieldError>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner /> : t('submit')}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
