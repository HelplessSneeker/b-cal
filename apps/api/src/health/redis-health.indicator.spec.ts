import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let mockCache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return healthy when Redis responds correctly', async () => {
    mockCache.set.mockResolvedValue(undefined);
    mockCache.get.mockResolvedValue('ok');
    mockCache.del.mockResolvedValue(undefined);

    const result = await indicator.isHealthy('redis');

    expect(result).toEqual({ redis: { status: 'up' } });
    expect(mockCache.set).toHaveBeenCalledWith(
      'health:redis:probe',
      'ok',
      5000,
    );
    expect(mockCache.get).toHaveBeenCalledWith('health:redis:probe');
    expect(mockCache.del).toHaveBeenCalledWith('health:redis:probe');
  });

  it('should throw HealthCheckError when Redis set fails', async () => {
    mockCache.set.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('redis')).rejects.toThrow(
      HealthCheckError,
    );
  });

  it('should throw HealthCheckError when Redis returns unexpected value', async () => {
    mockCache.set.mockResolvedValue(undefined);
    mockCache.get.mockResolvedValue('unexpected');
    mockCache.del.mockResolvedValue(undefined);

    await expect(indicator.isHealthy('redis')).rejects.toThrow(
      HealthCheckError,
    );
  });
});
