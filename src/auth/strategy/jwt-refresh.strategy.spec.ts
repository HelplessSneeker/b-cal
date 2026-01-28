import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtPayload } from '../types';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

jest.mock('../constants', () => ({
  jwtRefreshConstants: {
    secret: 'test-refresh-secret-key',
  },
}));

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtRefreshStrategy],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with id, email, and refreshToken', () => {
      const getMock = jest.fn().mockReturnValue('Bearer test-refresh-token');
      const mockRequest = {
        get: getMock,
      } as unknown as Request;

      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const result = strategy.validate(mockRequest, payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        refreshToken: 'test-refresh-token',
      });
      expect(getMock).toHaveBeenCalledWith('Authorization');
    });

    it('should extract refresh token from Authorization header', () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Bearer my-secret-refresh-token'),
      } as unknown as Request;

      const payload: JwtPayload = {
        sub: 'user-456',
        email: 'another@example.com',
      };

      const result = strategy.validate(mockRequest, payload);

      expect(result.refreshToken).toBe('my-secret-refresh-token');
    });

    it('should map sub to id correctly', () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Bearer token'),
      } as unknown as Request;

      const payload: JwtPayload = {
        sub: 'specific-user-id',
        email: 'user@example.com',
      };

      const result = strategy.validate(mockRequest, payload);

      expect(result.id).toBe('specific-user-id');
      expect(result.email).toBe('user@example.com');
    });
  });
});
