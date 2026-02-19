import { doubleCsrf, type DoubleCsrfUtilities } from 'csrf-csrf';
import { cookieDomain } from '../auth/constants';

const isProduction = process.env.NODE_ENV === 'production';

function getCsrfCookieName(): string {
  if (!isProduction) return 'csrf-token';
  // __Host- prefix requires no Domain attribute; use __Secure- when domain is set
  return cookieDomain ? '__Secure-csrf-token' : '__Host-csrf-token';
}

const csrf = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  getSessionIdentifier: () => '',
  cookieName: getCsrfCookieName(),
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProduction,
    httpOnly: true,
    ...(cookieDomain && { domain: cookieDomain }),
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

export const doubleCsrfProtection = csrf.doubleCsrfProtection;
export const generateCsrfToken = csrf.generateCsrfToken;
export const invalidCsrfTokenError: DoubleCsrfUtilities['invalidCsrfTokenError'] =
  csrf.invalidCsrfTokenError;
