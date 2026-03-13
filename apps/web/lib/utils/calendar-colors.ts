export interface EntryColorClasses {
  border: string;
  bg: string;
  bgHover: string;
  dot: string;
}

const COLOR_MAP: Record<string, EntryColorClasses> = {
  red: {
    border: 'border-red-500',
    bg: 'bg-red-500/20',
    bgHover: 'hover:bg-red-500/30',
    dot: 'bg-red-500',
  },
  orange: {
    border: 'border-orange-500',
    bg: 'bg-orange-500/20',
    bgHover: 'hover:bg-orange-500/30',
    dot: 'bg-orange-500',
  },
  yellow: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/20',
    bgHover: 'hover:bg-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  lime: {
    border: 'border-lime-500',
    bg: 'bg-lime-500/20',
    bgHover: 'hover:bg-lime-500/30',
    dot: 'bg-lime-500',
  },
  teal: {
    border: 'border-teal-500',
    bg: 'bg-teal-500/20',
    bgHover: 'hover:bg-teal-500/30',
    dot: 'bg-teal-500',
  },
  cyan: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-500/20',
    bgHover: 'hover:bg-cyan-500/30',
    dot: 'bg-cyan-500',
  },
  pink: {
    border: 'border-pink-500',
    bg: 'bg-pink-500/20',
    bgHover: 'hover:bg-pink-500/30',
    dot: 'bg-pink-500',
  },
  rose: {
    border: 'border-rose-500',
    bg: 'bg-rose-500/20',
    bgHover: 'hover:bg-rose-500/30',
    dot: 'bg-rose-500',
  },
};

export const DEFAULT_ENTRY_COLORS: EntryColorClasses = {
  border: 'border-primary',
  bg: 'bg-primary/20',
  bgHover: 'hover:bg-primary/30',
  dot: 'bg-primary',
};

export function getEntryColorClasses(
  calendarId: string | null | undefined,
  calendarsMap: Map<string, { color: string }>,
): EntryColorClasses {
  if (!calendarId) return DEFAULT_ENTRY_COLORS;
  const calendar = calendarsMap.get(calendarId);
  if (!calendar) return DEFAULT_ENTRY_COLORS;
  return COLOR_MAP[calendar.color] ?? DEFAULT_ENTRY_COLORS;
}

export function getColorClasses(color: string): EntryColorClasses {
  return COLOR_MAP[color] ?? DEFAULT_ENTRY_COLORS;
}
