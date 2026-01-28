import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../types';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

jest.mock('../constants', () => ({
  jwtConstants: {
    secret: 'test-secret-key',
  },
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with id and email from payload', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should map sub to id correctly', () => {
      const payload: JwtPayload = {
        sub: 'different-user-id',
        email: 'another@example.com',
      };

      const result = strategy.validate(payload);

      expect(result.id).toBe('different-user-id');
      expect(result.email).toBe('another@example.com');
    });
  });
});
