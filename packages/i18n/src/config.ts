export const defaultLocale = "en" as const;

export const locales = ["en", "de"] as const;

export type Locale = (typeof locales)[number];

export type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;
