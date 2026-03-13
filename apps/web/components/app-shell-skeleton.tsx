import { Skeleton } from '@/components/ui/skeleton';

function CalendarContentSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Desktop header skeleton */}
      <div className="hidden items-center justify-between border-b py-4 pr-6 md:flex">
        <div className="flex w-64 items-center justify-between pl-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* Mobile header skeleton */}
      <div className="flex items-center justify-between border-b px-3 py-2 md:hidden">
        <div className="flex items-center gap-1">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar skeleton */}
        <div className="hidden w-64 flex-col items-center gap-4 border-r p-4 md:flex">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>

        {/* Month grid skeleton */}
        <div className="min-w-0 flex-1">
          {/* Weekday header row */}
          <div className="grid grid-cols-7 border-y">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-l py-2 last:border-r"
              >
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          {/* Week rows */}
          <div className="flex flex-1 flex-col">
            {Array.from({ length: 6 }).map((_, week) => (
              <div key={week} className="grid flex-1 grid-cols-7 border-b">
                {Array.from({ length: 7 }).map((_, day) => (
                  <div key={day} className="border-l p-1 last:border-r">
                    <Skeleton className="mb-1 size-6 rounded-full" />
                    {week < 3 && day % 3 === 0 && (
                      <Skeleton className="mt-1 h-4 w-full rounded-sm" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex h-svh flex-col md:flex-row">
      {/* Desktop icon rail skeleton */}
      <nav className="hidden w-14 shrink-0 flex-col items-center border-r bg-background py-2 md:flex">
        <div className="flex flex-1 flex-col items-center gap-1">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
        <Skeleton className="size-8 rounded-full" />
      </nav>

      {/* Main content area */}
      <main className="min-w-0 flex-1 pb-14 md:pb-0">
        <CalendarContentSkeleton />
      </main>

      {/* Mobile bottom tab bar skeleton */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background md:hidden">
        <div className="flex flex-1 flex-col items-center gap-0.5 py-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 py-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 py-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
      </nav>
    </div>
  );
}
