/**
 * Get the start of the week containing the given date (Monday-based)
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  // Adjust for Monday start (0 = Sunday, so Monday = 1)
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get the end of the week containing the given date (Sunday)
 */
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date)
  const result = new Date(start)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get the start of the month containing the given date
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Get the end of the month containing the given date
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Get the ISO week number for the given date
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

/**
 * Get all 42 dates (6 rows x 7 days) for the month grid view.
 * The grid always starts on Monday and includes days from
 * previous/next months to fill the complete 6-week grid.
 */
export function getMonthGridDates(date: Date): Date[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = getStartOfWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    return day
  })
}
