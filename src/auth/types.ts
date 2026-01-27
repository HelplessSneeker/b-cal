import { User } from 'generated/prisma/client';

export type AuthenticatedUser = Omit<User, 'password'>;

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: User;
}
