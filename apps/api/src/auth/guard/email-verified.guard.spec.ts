import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { EmailVerifiedGuard } from './email-verified.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('EmailVerifiedGuard', () => {
  const guard = new EmailVerifiedGuard();

  it('should return true for a verified user', () => {
    const ctx = makeContext({
      id: 'user-1',
      email: 'test@example.com',
      emailVerified: true,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException for unverified user', () => {
    const ctx = makeContext({
      id: 'user-1',
      email: 'test@example.com',
      emailVerified: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('error.emailNotVerified');
  });

  it('should throw ForbiddenException when user is null', () => {
    const ctx = makeContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is undefined', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw when emailVerified is missing from user object', () => {
    const ctx = makeContext({ id: 'user-1', email: 'test@example.com' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
