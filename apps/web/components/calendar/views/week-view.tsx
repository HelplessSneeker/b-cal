"use client"

import { useMemo } from "react"
import { useCalendarStore, type CalendarEntry } from "@/lib/stores/calendarStore"
import { TimeGrid } from "@/components/calendar/time-grid"
import { DayColumn } from "@/components/calendar/day-column"
import { WeekAllDayRow } from "@/components/calendar/week-all-day-row"
import { getStartOfWeek } from "@/lib/calendar/date-utils"
import { TIME_COLUMN_WIDTH } from "@/lib/calendar/calendar-constants"

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getWeekDays(startOfWeek: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })
}

function formatDayHeader(date: Date): { weekday: string; dayNumber: string } {
  const weekday = date.toLocaleDateString("de-DE", { weekday: "short" })
  const dayNumber = date.getDate().toString()
  return { weekday, dayNumber }
}

function isToday(date: Date): boolean {
  const today = new Date()
  return isSameDay(date, today)
}

function entryOverlapsDay(entry: CalendarEntry, day: Date): boolean {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)

  const entryStart = new Date(entry.startDate)
  entryStart.setHours(0, 0, 0, 0)
  const entryEnd = new Date(entry.endDate)
  entryEnd.setHours(23, 59, 59, 999)

  return entryStart <= dayEnd && entryEnd >= dayStart
}

export function WeekView() {
  const { currentDate, entries, openEntryModal } = useCalendarStore()

  const startOfWeek = getStartOfWeek(currentDate)
  const weekDays = getWeekDays(startOfWeek)

  const allDayEntriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    const allDayEntries = entries.filter((entry) => entry.wholeDay)

    weekDays.forEach((day) => {
      const dayEntries = allDayEntries.filter((entry) =>
        entryOverlapsDay(entry, day)
      )
      if (dayEntries.length > 0) {
        map.set(day.toDateString(), dayEntries)
      }
    })

    return map
  }, [entries, weekDays])

  const getTimedEntriesForDay = (day: Date): CalendarEntry[] => {
    return entries.filter(
      (entry) => isSameDay(entry.startDate, day) && !entry.wholeDay
    )
  }

  const handleSlotClick = (time: Date) => {
    openEntryModal(undefined, time)
  }

  const handleEntryClick = (entry: CalendarEntry) => {
    openEntryModal(entry)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Week header with day names and dates */}
      <div className="flex border-b pr-2.5">
        {/* Empty space for time column alignment */}
        <div className="shrink-0" style={{ width: TIME_COLUMN_WIDTH }} />
        {/* Day headers */}
        <div className="flex flex-1">
          {weekDays.map((day) => {
            const { weekday, dayNumber } = formatDayHeader(day)
            const today = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className="flex flex-1 flex-col items-center border-l py-2"
              >
                <span className="text-xs uppercase text-muted-foreground">
                  {weekday}
                </span>
                <span
                  className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    today
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  {dayNumber}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {/* All-day entries row */}
      <WeekAllDayRow
        weekDays={weekDays}
        entriesByDay={allDayEntriesByDay}
        onEntryClick={handleEntryClick}
      />
      {/* Time grid with day columns */}
      <div className="flex-1 overflow-hidden">
        <TimeGrid>
          <div className="flex flex-1">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="flex-1 border-l">
                <DayColumn
                  date={day}
                  entries={getTimedEntriesForDay(day)}
                  onSlotClick={handleSlotClick}
                  onEntryClick={handleEntryClick}
                />
              </div>
            ))}
          </div>
        </TimeGrid>
      </div>
    </div>
  )
}
