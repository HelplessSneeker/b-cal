import { api, ApiError } from "./api"
import type { CalendarEntry } from "@/lib/stores/calendarStore"

interface EntryDTO {
  id: string
  title: string
  startDate: string
  endDate: string
  wholeDay: boolean
  content?: string
}

function toEntry(dto: EntryDTO): CalendarEntry {
  return {
    id: dto.id,
    title: dto.title,
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    wholeDay: dto.wholeDay,
    content: dto.content,
  }
}

function toDTO(entry: CalendarEntry | Omit<CalendarEntry, "id">): Omit<EntryDTO, "id"> {
  return {
    title: entry.title,
    startDate: entry.startDate.toISOString(),
    endDate: entry.endDate.toISOString(),
    wholeDay: entry.wholeDay,
    content: entry.content,
  }
}

export interface CalendarResponse {
  success: boolean
  error?: string
}

export async function getEntries(startDate?: Date, endDate?: Date): Promise<CalendarEntry[]> {
  try {
    const params = new URLSearchParams()
    if (startDate) {
      params.set("startDate", startDate.toISOString())
    }
    if (endDate) {
      params.set("endDate", endDate.toISOString())
    }
    const query = params.toString()
    const endpoint = `/calendar${query ? `?${query}` : ""}`

    const entries = await api<EntryDTO[]>(endpoint, {
      method: "GET",
      showSuccessToast: false,
    })
    return entries.map(toEntry)
  } catch {
    return []
  }
}

export async function createEntry(
  entry: Omit<CalendarEntry, "id">
): Promise<CalendarEntry | null> {
  try {
    const dto = await api<EntryDTO>("/calendar", {
      method: "POST",
      body: toDTO(entry),
    })
    return toEntry(dto)
  } catch (error) {
    if (error instanceof ApiError) {
      return null
    }
    return null
  }
}

export async function updateEntry(entry: CalendarEntry): Promise<CalendarEntry | null> {
  try {
    const dto = await api<EntryDTO>(`/calendar/${entry.id}`, {
      method: "PATCH",
      body: toDTO(entry),
    })
    return toEntry(dto)
  } catch (error) {
    if (error instanceof ApiError) {
      return null
    }
    return null
  }
}

export async function deleteEntry(id: string): Promise<CalendarResponse> {
  try {
    await api(`/calendar/${id}`, {
      method: "DELETE",
    })
    return { success: true }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unexpected error occurred" }
  }
}
