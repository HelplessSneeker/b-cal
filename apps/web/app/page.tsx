"use client"

import { useEffect, useCallback } from "react"
import { AuthProvider } from "@/components/AuthProvider"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar"
import { DayView } from "@/components/calendar/views/day-view"
import { WeekView } from "@/components/calendar/views/week-view"
import { MonthView } from "@/components/calendar/views/month-view"
import { CalendarView, useCalendarStore } from "@/lib/stores/calendarStore"
import { EntryModal } from "@/components/entry-modal"
import { getEntries } from "@/lib/api/calendar"

function CalendarPage() {
  const { setEntries, view } = useCalendarStore()

  const fetchEntries = useCallback(async () => {
    const entries = await getEntries()
    setEntries(entries)
  }, [setEntries])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return (
    <div className="flex h-screen flex-col">
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        <CalendarSidebar />
        <main className="flex-1">
          {view === CalendarView.Day && <DayView />}
          {view === CalendarView.Week && <WeekView />}
          {view === CalendarView.Month && <MonthView />}
        </main>
      </div>
      <EntryModal />
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <CalendarPage />
    </AuthProvider>
  )
}
