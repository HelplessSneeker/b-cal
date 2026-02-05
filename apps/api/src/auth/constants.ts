import type { CookieOptions } from 'express';

export const jwtConstants = {
  secret: process.env.SECRET_KEY!,
};

export const jwtRefreshConstants = {
  secret: process.env.REFRESH_SECRET_KEY!,
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
};
