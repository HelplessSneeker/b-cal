"use client"

import { useCalendarStore, type CalendarEntry } from "@/lib/stores/calendarStore"
import { TimeGrid } from "@/components/calendar/time-grid"
import { DayColumn } from "@/components/calendar/day-column"
import { AllDaySection } from "@/components/calendar/all-day-section"

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function DayView() {
  const { currentDate, entries, openEntryModal } = useCalendarStore()

  const dayEntries = entries.filter((entry) =>
    isSameDay(entry.startDate, currentDate)
  )

  const allDayEntries = dayEntries.filter((entry) => entry.wholeDay)
  const timedEntries = dayEntries.filter((entry) => !entry.wholeDay)

  const handleSlotClick = (time: Date) => {
    openEntryModal(undefined, time)
  }

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold capitalize">
          {formatDayHeader(currentDate)}
        </h2>
      </div>
      <AllDaySection entries={allDayEntries} onEntryClick={handleEntryClick} />
      <div className="flex-1 overflow-hidden">
        <TimeGrid>
          <DayColumn
            date={currentDate}
            entries={timedEntries}
            onSlotClick={handleSlotClick}
            onEntryClick={handleEntryClick}
          />
        </TimeGrid>
      </div>
    </div>
  )
}
