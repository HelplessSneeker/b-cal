'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { forgotPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function ForgotPasswordPage() {
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
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
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? <Spinner /> : t('submit')}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          )}
          <CardContent>
            <div className="text-center text-sm">
              <a href="/login" className="underline-offset-4 hover:underline">
                {tCommon('backToLogin')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
