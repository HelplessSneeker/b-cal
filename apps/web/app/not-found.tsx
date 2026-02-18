import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 px-4 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
