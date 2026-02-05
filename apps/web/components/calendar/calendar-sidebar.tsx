"use client"

import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarCalendar } from "@/components/calendar/sidebar-calendar"
import { useCalendarStore } from "@/lib/stores/calendarStore"

export function CalendarSidebar() {
  const { openEntryModal } = useCalendarStore()

  const handleNewEntry = () => {
    openEntryModal()
  }

  return (
    <aside className="flex w-64 flex-col items-center gap-4 border-r p-4">
      <Button onClick={handleNewEntry} className="w-full self-stretch">
        <PlusIcon className="mr-2 size-4" />
        New Entry
      </Button>
      <SidebarCalendar />
    </aside>
  )
}
