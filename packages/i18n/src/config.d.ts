export declare const defaultLocale: "en";
export declare const locales: readonly ["en", "de"];
export type Locale = (typeof locales)[number];
export type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;
