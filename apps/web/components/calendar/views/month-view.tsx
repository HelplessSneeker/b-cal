"use client"

import {
  useCalendarStore,
  CalendarView,
  type CalendarEntry,
} from "@/lib/stores/calendarStore"
import { getMonthGridDates } from "@/lib/calendar/date-utils"
import { DateCell } from "@/components/calendar/date-cell"
import { cn } from "@/lib/utils/utils"

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const WEEKDAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export function MonthView() {
  const { currentDate, entries, setView, setCurrentDate, openEntryModal } = useCalendarStore()

  const gridDates = getMonthGridDates(currentDate)
  const currentMonth = currentDate.getMonth()

  const getEntriesForDay = (day: Date): CalendarEntry[] => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    return entries.filter(
      (entry) => entry.startDate <= dayEnd && entry.endDate >= dayStart
    )
  }

  const handleMoreClick = (date: Date) => {
    setCurrentDate(date)
    setView(CalendarView.Day)
  }

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry)
  }

  const handleCellClick = (date: Date) => {
    const startTime = new Date(date)
    startTime.setHours(9, 0, 0, 0)
    openEntryModal(undefined, startTime)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_NAMES.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-xs font-medium uppercase text-muted-foreground",
              index > 0 && "border-l"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid - 6 rows x 7 columns */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {gridDates.map((date) => (
          <DateCell
            key={date.toISOString()}
            date={date}
            entries={getEntriesForDay(date)}
            isCurrentMonth={date.getMonth() === currentMonth}
            isToday={isSameDay(date, new Date())}
            onCellClick={handleCellClick}
            onEntryClick={handleEntryClick}
            onMoreClick={handleMoreClick}
          />
        ))}
      </div>
    </div>
  )
}
