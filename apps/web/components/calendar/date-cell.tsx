"use client"

import { type CalendarEntry } from "@/lib/stores/calendarStore"
import { EntryPreview } from "@/components/calendar/entry-preview"
import { MoreIndicator } from "@/components/calendar/more-indicator"
import { cn } from "@/lib/utils/utils"

interface DateCellProps {
  date: Date
  entries: CalendarEntry[]
  isCurrentMonth: boolean
  isToday: boolean
  onCellClick: (date: Date) => void
  onEntryClick: (entry: CalendarEntry) => void
  onMoreClick: (date: Date) => void
  maxVisibleEntries?: number
}

export function DateCell({
  date,
  entries,
  isCurrentMonth,
  isToday,
  onCellClick,
  onEntryClick,
  onMoreClick,
  maxVisibleEntries = 3,
}: DateCellProps) {
  const visibleEntries = entries.slice(0, maxVisibleEntries)
  const hiddenCount = entries.length - maxVisibleEntries
  const dayNumber = date.getDate()

  return (
    <div
      className={cn(
        "flex flex-col border-b border-l p-1",
        !isCurrentMonth && "bg-muted/50 text-muted-foreground"
      )}
      onClick={() => onCellClick(date)}
    >
      <span
        className={cn(
          "mb-1 self-end text-sm",
          isToday &&
            "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
        )}
      >
        {dayNumber}
      </span>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        {visibleEntries.map((entry) => (
          <EntryPreview
            key={entry.id}
            entry={entry}
            onClick={(e) => {
              e.stopPropagation()
              onEntryClick(entry)
            }}
          />
        ))}

        {hiddenCount > 0 && (
          <MoreIndicator
            count={hiddenCount}
            onClick={(e) => {
              e.stopPropagation()
              onMoreClick(date)
            }}
          />
        )}
      </div>
    </div>
  )
}
