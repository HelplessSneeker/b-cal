export const jwtConstants = {
  secret: process.env.SECRET_KEY!,
};

export const jwtRefreshConstants = {
  secret: process.env.REFRESH_SECRET_KEY!,
};

export const saltRounds = 10;
