export interface EntryColorClasses {
  border: string;
  bg: string;
  bgHover: string;
  dot: string;
  checkedBorder: string;
  checkedBg: string;
}

const COLOR_MAP: Record<string, EntryColorClasses> = {
  red: {
    border: 'border-entry-red',
    bg: 'bg-entry-red/20',
    bgHover: 'hover:bg-entry-red/30',
    dot: 'bg-entry-red',
    checkedBorder: 'data-[state=checked]:border-entry-red',
    checkedBg: 'data-[state=checked]:bg-entry-red',
  },
  orange: {
    border: 'border-entry-orange',
    bg: 'bg-entry-orange/20',
    bgHover: 'hover:bg-entry-orange/30',
    dot: 'bg-entry-orange',
    checkedBorder: 'data-[state=checked]:border-entry-orange',
    checkedBg: 'data-[state=checked]:bg-entry-orange',
  },
  yellow: {
    border: 'border-entry-yellow',
    bg: 'bg-entry-yellow/20',
    bgHover: 'hover:bg-entry-yellow/30',
    dot: 'bg-entry-yellow',
    checkedBorder: 'data-[state=checked]:border-entry-yellow',
    checkedBg: 'data-[state=checked]:bg-entry-yellow',
  },
  lime: {
    border: 'border-entry-lime',
    bg: 'bg-entry-lime/20',
    bgHover: 'hover:bg-entry-lime/30',
    dot: 'bg-entry-lime',
    checkedBorder: 'data-[state=checked]:border-entry-lime',
    checkedBg: 'data-[state=checked]:bg-entry-lime',
  },
  teal: {
    border: 'border-entry-teal',
    bg: 'bg-entry-teal/20',
    bgHover: 'hover:bg-entry-teal/30',
    dot: 'bg-entry-teal',
    checkedBorder: 'data-[state=checked]:border-entry-teal',
    checkedBg: 'data-[state=checked]:bg-entry-teal',
  },
  cyan: {
    border: 'border-entry-cyan',
    bg: 'bg-entry-cyan/20',
    bgHover: 'hover:bg-entry-cyan/30',
    dot: 'bg-entry-cyan',
    checkedBorder: 'data-[state=checked]:border-entry-cyan',
    checkedBg: 'data-[state=checked]:bg-entry-cyan',
  },
  pink: {
    border: 'border-entry-pink',
    bg: 'bg-entry-pink/20',
    bgHover: 'hover:bg-entry-pink/30',
    dot: 'bg-entry-pink',
    checkedBorder: 'data-[state=checked]:border-entry-pink',
    checkedBg: 'data-[state=checked]:bg-entry-pink',
  },
  rose: {
    border: 'border-entry-rose',
    bg: 'bg-entry-rose/20',
    bgHover: 'hover:bg-entry-rose/30',
    dot: 'bg-entry-rose',
    checkedBorder: 'data-[state=checked]:border-entry-rose',
    checkedBg: 'data-[state=checked]:bg-entry-rose',
  },
};

export const DEFAULT_ENTRY_COLORS: EntryColorClasses = {
  border: 'border-primary',
  bg: 'bg-primary/20',
  bgHover: 'hover:bg-primary/30',
  dot: 'bg-primary',
  checkedBorder: 'data-[state=checked]:border-primary',
  checkedBg: 'data-[state=checked]:bg-primary',
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
