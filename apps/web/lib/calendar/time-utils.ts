import { HOUR_HEIGHT, START_HOUR } from "@/lib/calendar/calendar-constants"

export function getEventTopPosition(startTime: Date): number {
  const hours = startTime.getHours()
  const minutes = startTime.getMinutes()
  const totalMinutes = (hours - START_HOUR) * 60 + minutes
  return (totalMinutes / 60) * HOUR_HEIGHT
}

export function getEventHeight(start: Date, end: Date): number {
  const durationMs = end.getTime() - start.getTime()
  const durationMinutes = durationMs / (1000 * 60)
  return (durationMinutes / 60) * HOUR_HEIGHT
}

export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`
}

export function getTimeFromPosition(yPosition: number, baseDate?: Date): Date {
  const totalMinutes = (yPosition / HOUR_HEIGHT) * 60
  const hours = Math.floor(totalMinutes / 60) + START_HOUR
  const minutes = Math.round(totalMinutes % 60)

  const date = baseDate ? new Date(baseDate) : new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}
