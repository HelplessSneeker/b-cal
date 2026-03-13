import { cn } from '@/lib/utils/utils';

interface ProgressBarProps {
  active: boolean;
  className?: string;
}

function ProgressBar({ active, className }: ProgressBarProps) {
  return (
    <div
      className={cn(
        'h-0.5 w-full overflow-hidden transition-opacity duration-300',
        active ? 'opacity-100' : 'opacity-0',
        className,
      )}
      role="progressbar"
      aria-busy={active}
    >
      <div className="bg-primary h-full animate-progress-indeterminate" />
    </div>
  );
}

export { ProgressBar };
