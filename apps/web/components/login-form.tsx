'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Spinner } from './ui/spinner';

interface LoginFormProps extends React.ComponentProps<'div'> {
  isSignup?: boolean;
}

export function LoginForm({
  className,
  isSignup = false,
  ...props
}: LoginFormProps) {
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
      const passwordError = validatePassword(password);
      if (passwordError) {
        newErrors.password = passwordError;
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
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
        const redirectTo =
          raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
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
            {isSignup ? 'Create an account' : 'Login to your account'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'Enter your details below to create your account'
              : 'Enter your email below to login to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
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
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}
                {isSignup && (
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                )}
                <Input
                  id="password"
                  type="password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                />
                <FieldError>{errors.password}</FieldError>
              </Field>
              {isSignup && (
                <Field data-invalid={!!errors.confirmPassword || undefined}>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
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
                  {isLoading ? <Spinner /> : isSignup ? 'Sign Up' : 'Login'}
                </Button>
                <FieldDescription className="text-center">
                  {isSignup ? (
                    <>
                      Already have an account? <a href="/login">Login</a>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account? <a href="/signup">Sign up</a>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
