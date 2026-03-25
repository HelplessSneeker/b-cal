'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { forgotPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const tFields = useTranslations('auth.fields');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await forgotPassword(email);
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {submitted ? t('descriptionSubmitted') : t('description')}
        </CardDescription>
      </CardHeader>
      {!submitted && (
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{tFields('email')}</FieldLabel>
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Spinner /> : t('submit')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      )}
      <CardFooter className="justify-center">
        <a
          href="/login"
          className="rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {tCommon('backToLogin')}
        </a>
      </CardFooter>
    </Card>
  );
}
