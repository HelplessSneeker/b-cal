import { Suspense } from 'react';
import { Loading } from '@/components/ui/loading';
import { AuthLayout } from '@/components/auth-layout';
import { VerifyEmailContent } from '@/components/verify-email-content';

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Loading />}>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
