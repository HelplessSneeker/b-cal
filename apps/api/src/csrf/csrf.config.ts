import { doubleCsrf, type DoubleCsrfUtilities } from 'csrf-csrf';

const isProduction = process.env.NODE_ENV === 'production';

const csrf = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  getSessionIdentifier: () => '',
  cookieName: isProduction ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProduction,
    httpOnly: true,
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

export const doubleCsrfProtection = csrf.doubleCsrfProtection;
export const generateCsrfToken = csrf.generateCsrfToken;
export const invalidCsrfTokenError: DoubleCsrfUtilities['invalidCsrfTokenError'] =
  csrf.invalidCsrfTokenError;
