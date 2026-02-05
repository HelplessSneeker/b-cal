"use client"

import { HOUR_HEIGHT, START_HOUR, END_HOUR, TIME_COLUMN_WIDTH } from "@/lib/calendar/calendar-constants"
import { formatHour } from "@/lib/calendar/time-utils"

export function TimeColumn() {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  )

  return (
    <div
      className="shrink-0 flex flex-col text-xs text-muted-foreground"
      style={{ width: TIME_COLUMN_WIDTH }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="flex items-center justify-end pr-2"
          style={{ height: HOUR_HEIGHT }}
        >
          {formatHour(hour)}
        </div>
      ))}
    </div>
  )
}
