import { api } from './api';

export interface CalendarDTO {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string | null;
}

export type CalendarColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'teal'
  | 'cyan'
  | 'pink'
  | 'rose';

export async function getCalendars(): Promise<CalendarDTO[]> {
  return api<CalendarDTO[]>('/calendars', {
    method: 'GET',
    showSuccessToast: false,
  });
}

export async function createCalendar(input: {
  name: string;
  color: CalendarColor;
}): Promise<CalendarDTO> {
  return api<CalendarDTO>('/calendars', {
    method: 'POST',
    body: input,
  });
}

export async function updateCalendar(
  id: string,
  input: { name?: string; color?: CalendarColor },
): Promise<CalendarDTO> {
  return api<CalendarDTO>(`/calendars/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteCalendar(
  id: string,
  deleteEntries?: boolean,
): Promise<void> {
  const params = deleteEntries ? '?deleteEntries=true' : '';
  await api(`/calendars/${encodeURIComponent(id)}${params}`, {
    method: 'DELETE',
  });
}
