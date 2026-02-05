"use client"

import { type CalendarEntry } from "@/lib/stores/calendarStore"
import { cn } from "@/lib/utils/utils"

interface EntryPreviewProps {
  entry: CalendarEntry
  onClick: (e: React.MouseEvent) => void
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}

export function EntryPreview({ entry, onClick }: EntryPreviewProps) {
  return (
    <div
      className={cn(
        "cursor-pointer truncate rounded px-1 py-0.5 text-xs transition-colors",
        "border-l-2 border-blue-500 bg-blue-500/20 hover:bg-blue-500/30"
      )}
      onClick={onClick}
    >
      {entry.wholeDay ? (
        <span className="font-medium">{entry.title}</span>
      ) : (
        <>
          <span className="text-muted-foreground">{formatTime(entry.startDate)}</span>
          <span className="ml-1 font-medium">{entry.title}</span>
        </>
      )}
    </div>
  )
}
