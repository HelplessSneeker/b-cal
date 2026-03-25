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
import { applyAccentColor } from '@/lib/utils/accent-color';
import { setThemeCookie } from '@/lib/utils/theme-cookie';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'blue' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'slate';
type WeekStart = 'monday' | 'sunday' | 'saturday';

const ACCENT_COLOR_KEYS: {
  key: AccentColor;
  color: string;
  fgColor: string;
}[] = [
  { key: 'blue', color: 'oklch(0.546 0.245 262.881)', fgColor: 'white' },
  { key: 'indigo', color: 'oklch(0.511 0.262 276.966)', fgColor: 'white' },
  { key: 'violet', color: 'oklch(0.541 0.281 293.009)', fgColor: 'white' },
  { key: 'emerald', color: 'oklch(0.596 0.145 163.225)', fgColor: 'white' },
  {
    key: 'amber',
    color: 'oklch(0.666 0.179 58.318)',
    fgColor: 'oklch(0.21 0.034 264.665)',
  },
  { key: 'slate', color: 'oklch(0.551 0.027 264.364)', fgColor: 'white' },
];

const WEEK_START_KEYS: WeekStart[] = ['monday', 'sunday', 'saturday'];

const INITIAL_THEME: Theme = 'system';
const INITIAL_ACCENT: AccentColor = 'blue';
const INITIAL_WEEK_START: WeekStart = 'monday';

/* OKLch values sourced from globals.css design tokens */
const THEME_COLORS = {
  light: {
    bg: 'oklch(1 0 0)',
    muted: 'oklch(0.967 0.003 264.542)',
    border: 'oklch(0.928 0.006 264.531)',
  },
  dark: {
    bg: 'oklch(0.13 0.028 261.692)',
    muted: 'oklch(0.278 0.033 256.848)',
    border: 'oklch(0.551 0.027 264.364)',
  },
};

function ThemePreview({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <div className="flex h-20 w-full flex-col overflow-hidden rounded-md border">
        <div
          className="flex-1"
          style={{ backgroundColor: THEME_COLORS.light.bg }}
        />
        <div
          className="flex gap-1 px-2 py-1.5"
          style={{ backgroundColor: THEME_COLORS.light.muted }}
        >
          <div
            className="h-1.5 w-6 rounded-full"
            style={{ backgroundColor: THEME_COLORS.light.border }}
          />
          <div
            className="h-1.5 w-4 rounded-full"
            style={{ backgroundColor: THEME_COLORS.light.border }}
          />
        </div>
      </div>
    );
  }
  if (theme === 'dark') {
    return (
      <div className="flex h-20 w-full flex-col overflow-hidden rounded-md border">
        <div
          className="flex-1"
          style={{ backgroundColor: THEME_COLORS.dark.bg }}
        />
        <div
          className="flex gap-1 px-2 py-1.5"
          style={{ backgroundColor: THEME_COLORS.dark.muted }}
        >
          <div
            className="h-1.5 w-6 rounded-full"
            style={{ backgroundColor: THEME_COLORS.dark.border }}
          />
          <div
            className="h-1.5 w-4 rounded-full"
            style={{ backgroundColor: THEME_COLORS.dark.border }}
          />
        </div>
      </div>
    );
  }
  // System: diagonal split
  return (
    <div className="relative flex h-20 w-full overflow-hidden rounded-md border">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: THEME_COLORS.light.bg }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: THEME_COLORS.dark.bg,
          clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex gap-1 px-2 py-1.5">
        <div
          className="h-1.5 w-6 rounded-full"
          style={{ backgroundColor: THEME_COLORS.light.border }}
        />
        <div
          className="h-1.5 w-4 rounded-full"
          style={{ backgroundColor: THEME_COLORS.light.border }}
        />
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

  const { setTheme: setNextTheme } = useTheme();
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [accentColor, setAccentColor] = useState<AccentColor>(storedAccent);
  const [weekStart, setWeekStart] = useState<WeekStart>(storedWeekStart);

  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    theme !== storedTheme ||
    accentColor !== storedAccent ||
    weekStart !== storedWeekStart;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updatePreferences({
        theme,
        accentColor,
        weekStart,
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
                aria-pressed={theme === themeKey}
                onClick={() => {
                  setTheme(themeKey);
                  setNextTheme(themeKey);
                  setThemeCookie(themeKey);
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 outline-none transition-all focus-visible:ring-ring/50 focus-visible:ring-[3px]',
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
                aria-label={t(`colors.${c.key}`)}
                aria-pressed={accentColor === c.key}
                onClick={() => {
                  setAccentColor(c.key);
                  applyAccentColor(c.key);
                }}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-full outline-none transition-all focus-visible:ring-ring/50 focus-visible:ring-[3px]',
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
                  <CheckIcon
                    className="size-4"
                    strokeWidth={3}
                    style={{ color: c.fgColor }}
                  />
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
                  aria-pressed={weekStart === ws}
                  onClick={() => setWeekStart(ws)}
                  className={cn(
                    'cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium outline-none transition-all focus-visible:ring-ring/50 focus-visible:ring-[3px]',
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
