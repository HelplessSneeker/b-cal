import { I18nContext } from 'nestjs-i18n';

export function t(key: string, args?: Record<string, unknown>): string {
  return I18nContext.current()?.translate(key, { args }) ?? key;
}
