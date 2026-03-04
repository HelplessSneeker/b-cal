import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { SessionService } from '../session.service';
import { JwtPayload } from '../types';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

jest.mock('../constants', () => ({
  jwtConstants: {
    secret: 'test-secret-key',
  },
}));

const mockSessionService = {
  findById: jest.fn(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object when session exists', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        sid: 'session-abc',
      };
      mockSessionService.findById.mockResolvedValue({ id: 'session-abc' });

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        sessionId: 'session-abc',
      });
      expect(mockSessionService.findById).toHaveBeenCalledWith('session-abc');
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        sid: 'revoked-session',
      };
      mockSessionService.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should skip session check when sid is not present', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        sessionId: undefined,
      });
      expect(mockSessionService.findById).not.toHaveBeenCalled();
    });
  });
});
