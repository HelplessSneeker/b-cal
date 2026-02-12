import { useEffect, useRef } from "react"
import { useCalendarStore, isRangeCovered } from "@/lib/stores/calendarStore"
import { getMonthGridDates } from "@/lib/calendar/date-utils"
import { getEntries } from "@/lib/api/calendar"

function getFetchWindow(currentDate: Date): { start: Date; end: Date } {
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

  const prevGrid = getMonthGridDates(prevMonth)
  const nextGrid = getMonthGridDates(nextMonth)

  return {
    start: prevGrid[0],
    end: nextGrid[nextGrid.length - 1],
  }
}

export function useCalendarData() {
  const view = useCalendarStore((s) => s.view)
  const currentDate = useCalendarStore((s) => s.currentDate)
  const inFlightRef = useRef(new Set<string>())

  useEffect(() => {
    const { start, end } = getFetchWindow(currentDate)
    const startTs = start.getTime()
    const endTs = end.getTime()

    const { loadedRanges } = useCalendarStore.getState()
    if (isRangeCovered(loadedRanges, startTs, endTs)) return

    const key = `${startTs}-${endTs}`
    if (inFlightRef.current.has(key)) return
    inFlightRef.current.add(key)

    const { setIsFetching, mergeEntries, addLoadedRange } = useCalendarStore.getState()
    setIsFetching(true)

    getEntries(start, end).then((entries) => {
      mergeEntries(entries)
      addLoadedRange(startTs, endTs)
      setIsFetching(false)
      inFlightRef.current.delete(key)
    })
  }, [view, currentDate])
}
