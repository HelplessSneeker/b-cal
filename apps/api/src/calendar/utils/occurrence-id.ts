const UUID_LENGTH = 36;
const SEPARATOR = ':';

export function composeSyntheticId(
  parentId: string,
  originalDate: Date,
): string {
  return `${parentId}${SEPARATOR}${originalDate.toISOString()}`;
}

export function isSyntheticId(id: string): boolean {
  return id.length > UUID_LENGTH && id[UUID_LENGTH] === SEPARATOR;
}

export function parseSyntheticId(
  id: string,
): { parentId: string; originalDate: Date } | null {
  if (!isSyntheticId(id)) return null;
  const parentId = id.slice(0, UUID_LENGTH);
  const dateStr = id.slice(UUID_LENGTH + 1);
  const originalDate = new Date(dateStr);
  if (isNaN(originalDate.getTime())) return null;
  return { parentId, originalDate };
}
