import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { AuthLayout } from '@/components/auth-layout';
import { Loading } from '@/components/ui/loading';

export default function Page() {
  return (
    <AuthLayout>
      <Suspense fallback={<Loading />}>
        <LoginForm isSignup />
      </Suspense>
    </AuthLayout>
  );
}
