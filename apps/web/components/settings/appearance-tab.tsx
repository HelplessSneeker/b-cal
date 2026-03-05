'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils/utils';

type Theme = 'light' | 'dark' | 'system';
type AccentColor =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'slate';
type WeekStart = 'monday' | 'sunday' | 'saturday';
type Density = 'compact' | 'default' | 'comfortable';

const ACCENT_COLORS: { key: AccentColor; label: string; color: string }[] = [
  { key: 'blue', label: 'Blue', color: '#3b82f6' },
  { key: 'indigo', label: 'Indigo', color: '#6366f1' },
  { key: 'violet', label: 'Violet', color: '#8b5cf6' },
  { key: 'rose', label: 'Rose', color: '#f43f5e' },
  { key: 'emerald', label: 'Emerald', color: '#10b981' },
  { key: 'amber', label: 'Amber', color: '#f59e0b' },
  { key: 'slate', label: 'Slate', color: '#64748b' },
];

const WEEK_STARTS: { key: WeekStart; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'sunday', label: 'Sunday' },
  { key: 'saturday', label: 'Saturday' },
];

const DENSITIES: { key: Density; label: string; description: string }[] = [
  {
    key: 'compact',
    label: 'Compact',
    description: 'Smaller text, tighter spacing',
  },
  { key: 'default', label: 'Default', description: 'Balanced readability' },
  {
    key: 'comfortable',
    label: 'Comfortable',
    description: 'Larger text, more spacing',
  },
];

const INITIAL_THEME: Theme = 'system';
const INITIAL_ACCENT: AccentColor = 'blue';
const INITIAL_WEEK_START: WeekStart = 'monday';
const INITIAL_DENSITY: Density = 'default';

function ThemePreview({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <div className="flex h-20 w-full flex-col overflow-hidden rounded-md border">
        <div className="flex-1 bg-white" />
        <div className="flex gap-1 bg-gray-100 px-2 py-1.5">
          <div className="h-1.5 w-6 rounded-full bg-gray-300" />
          <div className="h-1.5 w-4 rounded-full bg-gray-300" />
        </div>
      </div>
    );
  }
  if (theme === 'dark') {
    return (
      <div className="flex h-20 w-full flex-col overflow-hidden rounded-md border">
        <div className="flex-1 bg-gray-900" />
        <div className="flex gap-1 bg-gray-800 px-2 py-1.5">
          <div className="h-1.5 w-6 rounded-full bg-gray-600" />
          <div className="h-1.5 w-4 rounded-full bg-gray-600" />
        </div>
      </div>
    );
  }
  // System: diagonal split
  return (
    <div className="relative flex h-20 w-full overflow-hidden rounded-md border">
      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0 bg-gray-900"
        style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }}
      />
      <div className="absolute inset-x-0 bottom-0 flex gap-1 px-2 py-1.5">
        <div className="h-1.5 w-6 rounded-full bg-gray-400" />
        <div className="h-1.5 w-4 rounded-full bg-gray-400" />
      </div>
    </div>
  );
}

function MiniCalendarPreview({
  accentColor,
  theme,
}: {
  accentColor: string;
  theme: Theme;
}) {
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#475569' : '#cbd5e1';
  const headerBg = isDark ? '#334155' : '#f1f5f9';
  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Simple 5x7 grid, today is row 2, col 3 (Wednesday of week 2)
  const todayRow = 2;
  const todayCol = 2;
  const eventStartCol = 1;
  const eventEndCol = 3;

  return (
    <div
      className="w-full max-w-xs overflow-hidden rounded-lg border"
      style={{ backgroundColor: bgColor }}
    >
      {/* Month header */}
      <div
        className="px-3 py-2 text-center text-sm font-semibold"
        style={{ backgroundColor: headerBg, color: textColor }}
      >
        March 2026
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 pt-2">
        {dayHeaders.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium"
            style={{ color: mutedColor }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5 px-2 py-1">
        {Array.from({ length: 35 }, (_, i) => {
          const row = Math.floor(i / 7);
          const col = i % 7;
          const day = i - 1; // offset so day 1 starts at col 1
          const isToday = row === todayRow && col === todayCol;
          const dayNum = day >= 1 && day <= 31 ? day : null;

          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              {dayNum ? (
                <div
                  className="flex size-6 items-center justify-center rounded-full text-xs"
                  style={{
                    backgroundColor: isToday ? accentColor : 'transparent',
                    color: isToday ? '#ffffff' : textColor,
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {dayNum}
                </div>
              ) : (
                <div className="size-6" />
              )}
            </div>
          );
        })}
      </div>

      {/* Event bar */}
      <div className="px-2 pb-3">
        <div className="relative grid grid-cols-7">
          <div
            className="col-start-2 col-end-5 rounded px-1 py-0.5 text-xs font-medium text-white"
            style={{
              backgroundColor: accentColor,
              gridColumn: `${eventStartCol + 1} / ${eventEndCol + 2}`,
            }}
          >
            Meeting
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const [theme, setTheme] = useState<Theme>(INITIAL_THEME);
  const [accentColor, setAccentColor] = useState<AccentColor>(INITIAL_ACCENT);
  const [weekStart, setWeekStart] = useState<WeekStart>(INITIAL_WEEK_START);
  const [density, setDensity] = useState<Density>(INITIAL_DENSITY);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAccent =
    ACCENT_COLORS.find((c) => c.key === accentColor)?.color ??
    ACCENT_COLORS[0].color;

  const hasChanges =
    theme !== INITIAL_THEME ||
    accentColor !== INITIAL_ACCENT ||
    weekStart !== INITIAL_WEEK_START ||
    density !== INITIAL_DENSITY;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: persist to backend once appearance preferences API is implemented
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success('Appearance settings saved');
    } catch {
      toast.error('Failed to save appearance settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose how b-cal looks to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all',
                  theme === t
                    ? 'ring-ring/20 border-primary shadow-sm ring-2'
                    : 'border-border hover:border-muted-foreground/30',
                )}
              >
                <ThemePreview theme={t} />
                <span className="text-sm font-medium capitalize">{t}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color Card */}
      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>
            Used for the current day highlight, active selections, and buttons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                onClick={() => setAccentColor(c.key)}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-full transition-all',
                  accentColor === c.key
                    ? 'ring-offset-background ring-2 ring-offset-2'
                    : 'hover:scale-110',
                )}
                style={{
                  backgroundColor: c.color,
                  ringColor: accentColor === c.key ? c.color : undefined,
                  // Use outline ring for the selected color
                  ...(accentColor === c.key
                    ? {
                        boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${c.color}`,
                      }
                    : {}),
                }}
              >
                {accentColor === c.key && (
                  <CheckIcon className="size-4 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Display Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Display</CardTitle>
          <CardDescription>
            Adjust how the calendar grid is displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Week starts on */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Week starts on</span>
            <div className="flex gap-1">
              {WEEK_STARTS.map((ws) => (
                <button
                  key={ws.key}
                  type="button"
                  onClick={() => setWeekStart(ws.key)}
                  className={cn(
                    'cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                    weekStart === ws.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Density</span>
            <div className="flex flex-col gap-2">
              {DENSITIES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDensity(d.key)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all',
                    density === d.key
                      ? 'bg-accent/50 border-primary'
                      : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      density === d.key
                        ? 'border-primary'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {density === d.key && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-muted-foreground text-sm">
                      {d.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            A live preview of your current selections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MiniCalendarPreview accentColor={selectedAccent} theme={theme} />
        </CardContent>
      </Card>

      <div>
        <Button disabled={!hasChanges || isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
