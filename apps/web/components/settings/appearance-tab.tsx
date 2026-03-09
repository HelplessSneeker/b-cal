'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
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
import { useUserStore } from '@/lib/stores/userStore';
import { updatePreferences } from '@/lib/api/auth';

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

const ACCENT_COLOR_KEYS: { key: AccentColor; color: string }[] = [
  { key: 'blue', color: '#3b82f6' },
  { key: 'indigo', color: '#6366f1' },
  { key: 'violet', color: '#8b5cf6' },
  { key: 'rose', color: '#f43f5e' },
  { key: 'emerald', color: '#10b981' },
  { key: 'amber', color: '#f59e0b' },
  { key: 'slate', color: '#64748b' },
];

const WEEK_START_KEYS: WeekStart[] = ['monday', 'sunday', 'saturday'];

const DENSITY_KEYS: Density[] = ['compact', 'default', 'comfortable'];

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
  monthLabel,
  eventLabel,
}: {
  accentColor: string;
  theme: Theme;
  monthLabel: string;
  eventLabel: string;
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
        {monthLabel}
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
            {eventLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const t = useTranslations('settings.appearance');
  const tCommon = useTranslations('common');
  const { user, setUser } = useUserStore();

  const storedTheme = (user?.preferences?.theme as Theme) ?? INITIAL_THEME;
  const storedAccent =
    (user?.preferences?.accentColor as AccentColor) ?? INITIAL_ACCENT;
  const storedWeekStart =
    (user?.preferences?.weekStart as WeekStart) ?? INITIAL_WEEK_START;
  const storedDensity =
    (user?.preferences?.density as Density) ?? INITIAL_DENSITY;

  const { setTheme: setNextTheme } = useTheme();
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [accentColor, setAccentColor] = useState<AccentColor>(storedAccent);
  const [weekStart, setWeekStart] = useState<WeekStart>(storedWeekStart);
  const [density, setDensity] = useState<Density>(storedDensity);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAccent =
    ACCENT_COLOR_KEYS.find((c) => c.key === accentColor)?.color ??
    ACCENT_COLOR_KEYS[0].color;

  const hasChanges =
    theme !== storedTheme ||
    accentColor !== storedAccent ||
    weekStart !== storedWeekStart ||
    density !== storedDensity;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updatePreferences({
        theme,
        accentColor,
        weekStart,
        density,
      });
      if (user && updated) {
        setUser({ ...user, preferences: updated });
      }
      toast.success(t('saved'));
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('theme')}</CardTitle>
          <CardDescription>{t('themeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((themeKey) => (
              <button
                key={themeKey}
                type="button"
                onClick={() => {
                  setTheme(themeKey);
                  setNextTheme(themeKey);
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all',
                  theme === themeKey
                    ? 'ring-ring/20 border-primary shadow-sm ring-2'
                    : 'border-border hover:border-muted-foreground/30',
                )}
              >
                <ThemePreview theme={themeKey} />
                <span className="text-sm font-medium capitalize">
                  {t(`themes.${themeKey}`)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accentColor')}</CardTitle>
          <CardDescription>{t('accentColorDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLOR_KEYS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={t(`colors.${c.key}`)}
                onClick={() => setAccentColor(c.key)}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-full transition-all',
                  accentColor === c.key
                    ? 'ring-offset-background ring-2 ring-offset-2'
                    : 'hover:scale-110',
                )}
                style={{
                  backgroundColor: c.color,
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
          <CardTitle>{t('calendarDisplay')}</CardTitle>
          <CardDescription>{t('calendarDisplayDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Week starts on */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('weekStartsOn')}</span>
            <div className="flex gap-1">
              {WEEK_START_KEYS.map((ws) => (
                <button
                  key={ws}
                  type="button"
                  onClick={() => setWeekStart(ws)}
                  className={cn(
                    'cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                    weekStart === ws
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {t(`weekDays.${ws}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('density')}</span>
            <div className="flex flex-col gap-2">
              {DENSITY_KEYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all',
                    density === d
                      ? 'bg-accent/50 border-primary'
                      : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      density === d
                        ? 'border-primary'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {density === d && (
                      <div className="bg-primary size-2 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {t(`densities.${d}`)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {t(`densities.${d}Description`)}
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
          <CardTitle>{t('preview')}</CardTitle>
          <CardDescription>{t('previewDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <MiniCalendarPreview
            accentColor={selectedAccent}
            theme={theme}
            monthLabel={t('previewMonth')}
            eventLabel={t('previewEvent')}
          />
        </CardContent>
      </Card>

      <div>
        <Button disabled={!hasChanges || isSaving} onClick={handleSave}>
          {isSaving ? tCommon('saving') : tCommon('save')}
        </Button>
      </div>
    </div>
  );
}
