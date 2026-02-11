"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 px-4 text-center">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="mt-2">
          Try again
        </Button>
      </div>
    </div>
  );
}
