import { User } from 'generated/prisma/client';

export type AuthenticatedUser = Omit<User, 'password'>;

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: User;
}

export interface RequestWithRefreshUser extends Request {
  user: { id: string; email: string; refreshToken: string };
}
