import { useUserStore } from '@/lib/stores/userStore';
import { weekStartToDay } from '@/lib/calendar/date-utils';

export function useLocale() {
  const preferences = useUserStore((s) => s.user?.preferences);
  return {
    language:
      preferences?.language ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
    timezone:
      preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekStartDay: weekStartToDay(preferences?.weekStart ?? 'monday'),
  };
}
