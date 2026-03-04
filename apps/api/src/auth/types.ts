export interface JwtPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  sid?: string;
}

export interface JwtUser {
  id: string;
  email: string;
  emailVerified: boolean;
  sessionId?: string;
}

export interface JwtRefreshUser extends JwtUser {
  refreshToken: string;
  sessionId: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface AccessTokenResponse {
  access_token: string;
}
