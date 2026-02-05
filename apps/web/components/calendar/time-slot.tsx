"use client"

import { SLOT_HEIGHT } from "@/lib/calendar/calendar-constants"
import { cn } from "@/lib/utils/utils"

interface TimeSlotProps {
  time: Date
  onClick: (time: Date) => void
}

export function TimeSlot({ time, onClick }: TimeSlotProps) {
  const isHourBoundary = time.getMinutes() === 30

  return (
    <div
      className={cn(
        "cursor-pointer border-b transition-colors hover:bg-muted/50",
        isHourBoundary ? "border-border" : "border-border/30"
      )}
      style={{ height: SLOT_HEIGHT }}
      onClick={() => onClick(time)}
    />
  )
}
