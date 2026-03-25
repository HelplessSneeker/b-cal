import { Suspense } from 'react';
import { Loading } from '@/components/ui/loading';
import { AuthLayout } from '@/components/auth-layout';
import { ResetPasswordForm } from '@/components/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Loading />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
