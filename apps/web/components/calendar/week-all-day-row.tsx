"use client"

import { CalendarEntry } from "@/lib/stores/calendarStore"
import { TIME_COLUMN_WIDTH } from "@/lib/calendar/calendar-constants"
import { cn } from "@/lib/utils/utils"

interface WeekAllDayRowProps {
  weekDays: Date[]
  entriesByDay: Map<string, CalendarEntry[]>
  onEntryClick: (entry: CalendarEntry) => void
}

export function WeekAllDayRow({
  weekDays,
  entriesByDay,
  onEntryClick,
}: WeekAllDayRowProps) {
  const hasAnyEntries = weekDays.some(
    (day) => (entriesByDay.get(day.toDateString()) || []).length > 0
  )

  if (!hasAnyEntries) {
    return null
  }

  return (
    <div className="flex border-b pr-2.5">
      <div
        className="flex shrink-0 items-center justify-end pr-2 text-xs text-muted-foreground"
        style={{ width: TIME_COLUMN_WIDTH }}
      >
        all-day
      </div>
      <div className="flex flex-1">
        {weekDays.map((day) => {
          const dayEntries = entriesByDay.get(day.toDateString()) || []
          return (
            <div
              key={day.toISOString()}
              className="flex flex-1 flex-col gap-1 border-l p-1"
            >
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "cursor-pointer truncate rounded-md border-l-[3px] border-blue-500 bg-blue-500/20 px-2 py-0.5 text-xs font-medium transition-colors hover:bg-blue-500/30"
                  )}
                  onClick={() => onEntryClick(entry)}
                >
                  {entry.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
