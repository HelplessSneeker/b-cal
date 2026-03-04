import { useUserStore } from '@/lib/stores/userStore';

export function useLocale() {
  const preferences = useUserStore((s) => s.user?.preferences);
  return {
    language:
      preferences?.language ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
    timezone:
      preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
