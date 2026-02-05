"use client"

import { CalendarEntry } from "@/lib/stores/calendarStore"
import { getEventTopPosition, getEventHeight } from "@/lib/calendar/time-utils"
import { cn } from "@/lib/utils/utils"

interface EntryBlockProps {
  entry: CalendarEntry
  onClick: (entry: CalendarEntry) => void
}

function formatTimeRange(start: Date, end: Date): string {
  const format = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  return `${format(start)} - ${format(end)}`
}

export function EntryBlock({ entry, onClick }: EntryBlockProps) {
  const top = getEventTopPosition(entry.startDate)
  const height = getEventHeight(entry.startDate, entry.endDate)
  const isShort = height < 40

  return (
    <div
      className={cn(
        "absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border-l-[3px] border-blue-500 bg-blue-500/20 px-2 py-1 transition-colors hover:bg-blue-500/30",
        isShort && "py-0"
      )}
      style={{ top, height }}
      onClick={() => onClick(entry)}
    >
      <p className="truncate text-sm font-medium">{entry.title}</p>
      {!isShort && (
        <p className="truncate text-xs text-muted-foreground">
          {formatTimeRange(entry.startDate, entry.endDate)}
        </p>
      )}
    </div>
  )
}
