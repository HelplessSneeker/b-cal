'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';
import { validatePassword } from '@/lib/utils/password';
import { login, signup } from '@/lib/api/auth';
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from './ui/password-strength';
import { Spinner } from './ui/spinner';

interface LoginFormProps extends React.ComponentProps<'div'> {
  isSignup?: boolean;
}

export function LoginForm({
  className,
  isSignup = false,
  ...props
}: LoginFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      const newErrors: Record<string, string> = {};
      const passwordError = validatePassword(password, t);
      if (passwordError) {
        newErrors.password = passwordError;
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = t('validation.passwordsDoNotMatch');
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        return;
      }
    }

    setIsLoading(true);

    const result = isSignup
      ? await signup(email, password)
      : await login(email, password);

    setIsLoading(false);

    if (result.success) {
      if (isSignup) {
        router.push('/check-email');
      } else {
        const raw = searchParams.get('from') ?? '/';
        let redirectTo = '/';
        try {
          const target = new URL(raw, window.location.origin);
          if (target.origin === window.location.origin) {
            redirectTo = target.pathname + target.search + target.hash;
          }
        } catch {
          // Invalid URL, fall back to '/'
        }
        router.push(redirectTo);
        router.refresh();
      }
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isSignup ? t('signup.title') : t('login.title')}
          </CardTitle>
          <CardDescription>
            {isSignup ? t('signup.description') : t('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t('fields.email')}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                {!isSignup && (
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">
                      {t('fields.password')}
                    </FieldLabel>
                    <a
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      {t('login.forgotPassword')}
                    </a>
                  </div>
                )}
                {isSignup && (
                  <FieldLabel htmlFor="password">
                    {t('fields.password')}
                  </FieldLabel>
                )}
                <PasswordInput
                  id="password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                />
                {isSignup && password && (
                  <PasswordStrengthIndicator password={password} />
                )}
                <FieldError>{errors.password}</FieldError>
              </Field>
              {isSignup && (
                <Field data-invalid={!!errors.confirmPassword || undefined}>
                  <FieldLabel htmlFor="confirm-password">
                    {t('signup.confirmPassword')}
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
                  />
                  <FieldError>{errors.confirmPassword}</FieldError>
                </Field>
              )}
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Spinner />
                  ) : isSignup ? (
                    t('signup.submit')
                  ) : (
                    t('login.submit')
                  )}
                </Button>
                <FieldDescription className="text-center">
                  {isSignup
                    ? t.rich('signup.hasAccount', {
                        login: (chunks) => <a href="/login">{chunks}</a>,
                      })
                    : t.rich('login.noAccount', {
                        signup: (chunks) => <a href="/signup">{chunks}</a>,
                      })}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
