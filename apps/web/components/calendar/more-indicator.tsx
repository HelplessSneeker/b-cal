"use client"

interface MoreIndicatorProps {
  count: number
  onClick: (e: React.MouseEvent) => void
}

export function MoreIndicator({ count, onClick }: MoreIndicatorProps) {
  return (
    <button
      className="mt-auto cursor-pointer text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      onClick={onClick}
    >
      +{count} weitere
    </button>
  )
}
