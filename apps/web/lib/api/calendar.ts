import { api } from './api';
import type { CalendarEntry } from '@/lib/stores/calendarStore';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type EditScope = 'SINGLE' | 'THIS_AND_FUTURE' | 'ALL';

interface EntryDTO {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  wholeDay: boolean;
  content?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceByDay?: string | null;
  recurrenceUntil?: string | null;
  originalDate?: string | null;
}

function toEntry(dto: EntryDTO): CalendarEntry {
  return {
    id: dto.id,
    title: dto.title,
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    wholeDay: dto.wholeDay,
    content: dto.content,
    isRecurring: dto.isRecurring ?? false,
    recurrenceFrequency: dto.recurrenceFrequency ?? null,
    recurrenceByDay: dto.recurrenceByDay ?? null,
    recurrenceUntil: dto.recurrenceUntil ? new Date(dto.recurrenceUntil) : null,
    originalDate: dto.originalDate ? new Date(dto.originalDate) : null,
  };
}

export interface CreateEntryInput {
  title: string;
  startDate: Date;
  endDate: Date;
  wholeDay: boolean;
  content?: string;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceByDay?: string;
  recurrenceUntil?: string;
}

function toCreateDTO(input: CreateEntryInput): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    title: input.title,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString(),
    wholeDay: input.wholeDay,
    content: input.content,
  };
  if (input.recurrenceFrequency) {
    dto.recurrenceFrequency = input.recurrenceFrequency;
  }
  if (input.recurrenceByDay) {
    dto.recurrenceByDay = input.recurrenceByDay;
  }
  if (input.recurrenceUntil) {
    dto.recurrenceUntil = input.recurrenceUntil;
  }
  return dto;
}

interface RecurrenceUpdate {
  frequency: RecurrenceFrequency;
  byDay?: string;
  until?: string;
}

function toUpdateDTO(
  entry: CalendarEntry,
  scope?: EditScope,
  recurrence?: RecurrenceUpdate,
): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    title: entry.title,
    startDate: entry.startDate.toISOString(),
    endDate: entry.endDate.toISOString(),
    wholeDay: entry.wholeDay,
    content: entry.content,
  };
  if (scope) {
    dto.scope = scope;
  }
  if (recurrence) {
    dto.recurrenceFrequency = recurrence.frequency;
    if (recurrence.byDay) {
      dto.recurrenceByDay = recurrence.byDay;
    }
    if (recurrence.until) {
      dto.recurrenceUntil = recurrence.until;
    }
  }
  return dto;
}

export async function getEntries(
  startDate?: Date,
  endDate?: Date,
): Promise<CalendarEntry[]> {
  const params = new URLSearchParams();
  if (startDate) {
    params.set('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.set('endDate', endDate.toISOString());
  }
  const query = params.toString();
  const endpoint = `/calendar${query ? `?${query}` : ''}`;

  const entries = await api<EntryDTO[]>(endpoint, {
    method: 'GET',
    showSuccessToast: false,
  });
  return entries.map(toEntry);
}

export async function createEntry(
  input: CreateEntryInput,
): Promise<CalendarEntry> {
  const dto = await api<EntryDTO>('/calendar', {
    method: 'POST',
    body: toCreateDTO(input),
  });
  return toEntry(dto);
}

export async function updateEntry(
  entry: CalendarEntry,
  scope?: EditScope,
  recurrence?: RecurrenceUpdate,
): Promise<CalendarEntry> {
  const dto = await api<EntryDTO>(`/calendar/${encodeURIComponent(entry.id)}`, {
    method: 'PATCH',
    body: toUpdateDTO(entry, scope, recurrence),
  });
  return toEntry(dto);
}

export async function deleteEntry(
  id: string,
  scope?: EditScope,
): Promise<void> {
  const params = scope ? `?scope=${scope}` : '';
  await api(`/calendar/${encodeURIComponent(id)}${params}`, {
    method: 'DELETE',
  });
}
