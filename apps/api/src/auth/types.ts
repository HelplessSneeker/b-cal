export interface JwtPayload {
  sub: string;
  email: string;
}

export interface JwtUser {
  id: string;
  email: string;
}

export interface JwtRefreshUser extends JwtUser {
  refreshToken: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}
