"use client"

import { useRouter } from "next/navigation"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"
import { logout } from "@/lib/api/auth"
import { useUserStore } from "@/lib/stores/userStore"
import { useCalendarStore, CalendarView } from "@/lib/stores/calendarStore"
import { getWeekNumber } from "@/lib/calendar/date-utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getAvatarInitials(email: string): string {
  const [localPart, domain] = email.split("@")
  const localInitial = localPart?.[0]?.toUpperCase() ?? ""
  const domainInitial = domain?.[0]?.toUpperCase() ?? ""
  return `${localInitial}${domainInitial}`
}

function formatDateDisplay(date: Date, view: CalendarView): string {
  switch (view) {
    case CalendarView.Day:
      // todo change based on localization
      return date.toLocaleDateString("at-DE", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    case CalendarView.Week:
      return `CW ${getWeekNumber(date)}`
    case CalendarView.Month:
      // todo change based on localization
      return date.toLocaleDateString("at-DE", {
        month: "long",
        year: "numeric",
      })
  }
}

export function CalendarHeader() {
  const router = useRouter()
  const { user, clearUser } = useUserStore()
  const { view, currentDate, setView, setCurrentDate } = useCalendarStore()
  const initials = user?.email ? getAvatarInitials(user.email) : "?"

  const handleTodayClick = () => {
    setCurrentDate(new Date())
  }

  const handleViewChange = (newView: CalendarView) => {
    setView(newView)
  }

  const handleNavigate = (direction: -1 | 1) => {
    const newDate = new Date(currentDate)
    switch (view) {
      case CalendarView.Day:
        newDate.setDate(newDate.getDate() + direction)
        break
      case CalendarView.Week:
        newDate.setDate(newDate.getDate() + direction * 7)
        break
      case CalendarView.Month:
        newDate.setMonth(newDate.getMonth() + direction)
        break
    }
    setCurrentDate(newDate)
  }

  const handleAvatarMenuClick = (action: string) => {
    toast.info(`${action} clicked`)
  }

  const handleLogout = async () => {
    await logout()
    clearUser()
    router.push("/login")
  }

  return (
    <header className="flex items-center justify-between border-b py-4 pr-6">
      <div className="flex w-64 items-center justify-between pl-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button variant="outline" size="sm" onClick={handleTodayClick}>
          Today
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleNavigate(-1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-muted-foreground">
          {formatDateDisplay(currentDate, view)}
        </span>
        <Button variant="ghost" size="icon" onClick={() => handleNavigate(1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {view}
              <ChevronDownIcon className="ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewChange(CalendarView.Day)}>
              Day
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewChange(CalendarView.Week)}>
              Week
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewChange(CalendarView.Month)}>
              Month
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAvatarMenuClick("Settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAvatarMenuClick("Profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
