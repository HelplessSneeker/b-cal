import { Suspense } from 'react';
import { Loading } from '@/components/ui/loading';
import { AuthLayout } from '@/components/auth-layout';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Loading />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
