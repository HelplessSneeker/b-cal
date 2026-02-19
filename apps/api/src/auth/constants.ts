import type { CookieOptions } from 'express';

export const jwtConstants = {
  secret: process.env.SECRET_KEY!,
  refreshSecret: process.env.REFRESH_SECRET_KEY!,
  mailSecret: process.env.MAIL_SECRET_KEY!,
};

export const saltRounds = 10;

interface CookieConfig {
  accessToken: {
    name: string;
    maxAge: number;
  };
  refreshToken: {
    name: string;
    maxAge: number;
  };
  options: CookieOptions;
}

const isProduction = process.env.NODE_ENV === 'production';

function getCookieDomain(): string | undefined {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) return undefined;
  try {
    return new URL(frontendUrl).hostname;
  } catch {
    return undefined;
  }
}

export const cookieDomain = getCookieDomain();

export const cookieConfig: CookieConfig = {
  accessToken: {
    name: 'access_token',
    maxAge: 60 * 60 * 1000, // 1 hour in ms
  },
  refreshToken: {
    name: 'refresh_token',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
  options: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    ...(cookieDomain && { domain: cookieDomain }),
  },
};
