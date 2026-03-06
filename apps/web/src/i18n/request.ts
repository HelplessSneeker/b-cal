import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from '@b-cal/i18n/config';
import enCommon from '@b-cal/i18n/locales/en/common.json';
import enAuth from '@b-cal/i18n/locales/en/auth.json';
import enSettings from '@b-cal/i18n/locales/en/settings.json';
import enCalendar from '@b-cal/i18n/locales/en/calendar.json';
import enError from '@b-cal/i18n/locales/en/error.json';
import deCommon from '@b-cal/i18n/locales/de/common.json';
import deAuth from '@b-cal/i18n/locales/de/auth.json';
import deSettings from '@b-cal/i18n/locales/de/settings.json';
import deCalendar from '@b-cal/i18n/locales/de/calendar.json';
import deError from '@b-cal/i18n/locales/de/error.json';

const allMessages: Record<Locale, Record<string, unknown>> = {
  en: {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    calendar: enCalendar,
    error: enError,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    settings: deSettings,
    calendar: deCalendar,
    error: deError,
  },
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value;
  const locale: Locale =
    raw && (locales as readonly string[]).includes(raw)
      ? (raw as Locale)
      : defaultLocale;

  return { locale, messages: allMessages[locale] };
});
