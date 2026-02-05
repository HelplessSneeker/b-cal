"use client"

import { CalendarEntry } from "@/lib/stores/calendarStore"
import { TimeSlot } from "@/components/calendar/time-slot"
import { EntryBlock } from "@/components/calendar/entry-block"
import { CurrentTimeIndicator } from "@/components/calendar/current-time-indicator"

interface DayColumnProps {
  date: Date
  entries: CalendarEntry[]
  onSlotClick: (time: Date) => void
  onEntryClick: (entry: CalendarEntry) => void
}

export function DayColumn({ date, entries, onSlotClick, onEntryClick }: DayColumnProps) {
  const slots = Array.from({ length: 48 }, (_, i) => {
    const slotTime = new Date(date)
    slotTime.setHours(Math.floor(i / 2), (i % 2) * 30, 0, 0)
    return slotTime
  })

  return (
    <div className="relative flex-1">
      {slots.map((time, i) => (
        <TimeSlot key={i} time={time} onClick={onSlotClick} />
      ))}
      {entries.map((entry) => (
        <EntryBlock key={entry.id} entry={entry} onClick={onEntryClick} />
      ))}
      <CurrentTimeIndicator date={date} />
    </div>
  )
}
