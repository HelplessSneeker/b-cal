'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';
import { updatePreferences } from '@/lib/api/auth';
import { useUserStore } from '@/lib/stores/userStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/utils';

const LANGUAGES = [
  { code: 'en-US', native: 'English', english: '' },
  { code: 'de-DE', native: 'Deutsch', english: 'German' },
] as const;

const TIMEZONES = Intl.supportedValuesOf('timeZone');

function getUtcOffsets(tz: string): string {
  const jan = new Date(2025, 0, 1);
  const jul = new Date(2025, 6, 1);

  const fmt = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';

  const winter = fmt(jan);
  const summer = fmt(jul);

  if (winter === summer) return winter;
  return `${winter} / ${summer}`;
}

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({
  value: tz,
  offset: getUtcOffsets(tz),
}));

function formatTime(tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function LocalizationTab() {
  const { user, setUser } = useUserStore();
  const storedLang = user?.preferences?.language ?? '';
  const storedTz = user?.preferences?.timezone ?? '';

  const [selectedLanguage, setSelectedLanguage] = useState(
    () =>
      storedLang ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
  );
  const [selectedTimezone, setSelectedTimezone] = useState(
    () => storedTz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(() =>
    formatTime(selectedTimezone),
  );
  const tzSearchInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    selectedLanguage !== storedLang || selectedTimezone !== storedTz;

  const selectedLangOption =
    LANGUAGES.find((l) => l.code === selectedLanguage) ?? LANGUAGES[0];

  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return TIMEZONE_OPTIONS;
    const q = tzSearch.toLowerCase();
    return TIMEZONE_OPTIONS.filter(
      (tz) =>
        tz.value.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q),
    );
  }, [tzSearch]);

  // Update live time preview every minute
  useEffect(() => {
    setCurrentTime(formatTime(selectedTimezone));
    const interval = setInterval(() => {
      setCurrentTime(formatTime(selectedTimezone));
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  // Focus search input when timezone popover opens
  useEffect(() => {
    if (tzOpen) {
      requestAnimationFrame(() => tzSearchInputRef.current?.focus());
    } else {
      setTzSearch('');
    }
  }, [tzOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updatePreferences({
        language: selectedLanguage,
        timezone: selectedTimezone,
      });
      if (user && updated) {
        setUser({ ...user, preferences: updated });
      }
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>
            Controls the display language of the interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={langOpen} onOpenChange={setLangOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-60 justify-between">
                {selectedLangOption.native}
                <ChevronDownIcon className="text-muted-foreground size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1" align="start">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm',
                    selectedLanguage === lang.code
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setLangOpen(false);
                  }}
                >
                  <span>
                    {lang.native}
                    {lang.english && (
                      <span className="text-muted-foreground ml-1">
                        ({lang.english})
                      </span>
                    )}
                  </span>
                  {selectedLanguage === lang.code && (
                    <CheckIcon className="size-4" />
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Timezone Card */}
      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>
            Your calendar events will be displayed relative to this timezone.
            This also affects reminders and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full max-w-md justify-between"
              >
                <span className="truncate">{selectedTimezone}</span>
                <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-md p-0" align="start">
              <div className="p-2">
                <Input
                  ref={tzSearchInputRef}
                  placeholder="Search timezones..."
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-60">
                <div className="p-1">
                  {filteredTimezones.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                      No timezones found.
                    </p>
                  ) : (
                    filteredTimezones.map((tz) => (
                      <div
                        key={tz.value}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm',
                          selectedTimezone === tz.value
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted',
                        )}
                        onClick={() => {
                          setSelectedTimezone(tz.value);
                          setTzOpen(false);
                        }}
                      >
                        <span className="truncate">{tz.value}</span>
                        <span className="text-muted-foreground ml-2 flex shrink-0 items-center gap-1 text-xs">
                          {tz.offset}
                          {selectedTimezone === tz.value && (
                            <CheckIcon className="size-4" />
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div className="bg-muted/50 text-muted-foreground rounded-md px-3 py-2 text-sm">
            Current time in {selectedTimezone}: {currentTime}
          </div>
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
