import { locales, defaultLocale, type Locale } from '@b-cal/i18n/config';

const COOKIE_NAME = 'locale';
const MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Maps a language preference (e.g. "de-DE", "en-US") to a supported locale.
 */
export function resolveLocale(language: string): Locale {
  const prefix = language.split('-')[0];
  if ((locales as readonly string[]).includes(prefix)) {
    return prefix as Locale;
  }
  return defaultLocale;
}

/**
 * Sets the locale cookie. Call from client code when the user's
 * language preference is known or changes.
 */
export function setLocaleCookie(language: string): void {
  const locale = resolveLocale(language);
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
