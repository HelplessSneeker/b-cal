import type { TranslateFn } from '@b-cal/i18n/config';

const defaultMessages: Record<string, string> = {
  'validation.passwordMinLength': 'Password must be at least 8 characters',
  'validation.passwordNeedsNumber': 'Password must contain at least one number',
  'validation.passwordNeedsSymbol': 'Password must contain at least one symbol',
};

export function validatePassword(
  password: string,
  t: TranslateFn = (key) => defaultMessages[key] ?? key,
): string | null {
  if (password.length < 8) {
    return t('validation.passwordMinLength');
  }
  if (!/\d/.test(password)) {
    return t('validation.passwordNeedsNumber');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return t('validation.passwordNeedsSymbol');
  }
  return null;
}
