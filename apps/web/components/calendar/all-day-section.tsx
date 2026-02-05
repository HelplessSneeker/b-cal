"use client"

import { CalendarEntry } from "@/lib/stores/calendarStore"
import { cn } from "@/lib/utils/utils"

interface AllDaySectionProps {
  entries: CalendarEntry[]
  onEntryClick: (entry: CalendarEntry) => void
}

export function AllDaySection({ entries, onEntryClick }: AllDaySectionProps) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="border-b px-4 py-2">
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "cursor-pointer rounded-md border-l-[3px] border-blue-500 bg-blue-500/20 px-3 py-1 transition-colors hover:bg-blue-500/30"
            )}
            onClick={() => onEntryClick(entry)}
          >
            <p className="text-sm font-medium">{entry.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
