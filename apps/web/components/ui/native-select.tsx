import * as React from 'react';

import { cn } from '@/lib/utils/utils';

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
