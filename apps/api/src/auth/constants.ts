import type { CookieOptions } from 'express';

export const jwtConstants = {
  secret: process.env.SECRET_KEY!,
  refreshSecret: process.env.REFRESH_SECRET_KEY!,
  mailSecret: process.env.MAIL_SECRET_KEY!,
};

export const saltRounds = 10;

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
export const SESSION_MAX_SESSIONS = 5;

interface TokenConfig {
  name: string;
  maxAge: number;
  options: CookieOptions;
}

interface CookieConfig {
  accessToken: TokenConfig;
  refreshToken: TokenConfig;
}

const isProduction = process.env.NODE_ENV === 'production';

function getCookieDomain(): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) return undefined;
  try {
    const hostname = new URL(frontendUrl).hostname;
    if (hostname === 'localhost') return undefined;
    return hostname;
  } catch {
    return undefined;
  }
}

export const cookieDomain = getCookieDomain();

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  ...(cookieDomain && { domain: cookieDomain }),
};

export const cookieConfig: CookieConfig = {
  accessToken: {
    name: 'access_token',
    maxAge: 60 * 60 * 1000, // 1 hour in ms
    options: baseOptions,
  },
  refreshToken: {
    name: 'refresh_token',
    maxAge: SESSION_MAX_AGE_MS, // 30 days in ms
    options: { ...baseOptions, path: '/auth/refresh' },
  },
};
