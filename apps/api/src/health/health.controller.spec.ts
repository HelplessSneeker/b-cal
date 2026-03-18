import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  DiskHealthIndicator,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              details: {
                database: { status: 'up' },
                memory_heap: { status: 'up' },
                storage: { status: 'up' },
              },
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn() },
        },
        {
          provide: DiskHealthIndicator,
          useValue: { checkStorage: jest.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result with only status', async () => {
    const result = await controller.check();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(healthCheckService.check).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Function)]),
    );
    expect(result).toEqual({ status: 'ok' });
  });

  it('should log details and rethrow when health check fails', async () => {
    const failedResponse = {
      status: 'error',
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' } },
    };
    const error = Object.assign(new Error('Health check failed'), {
      response: failedResponse,
    });
    (healthCheckService.check as jest.Mock).mockRejectedValue(error);

    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(warnSpy).toHaveBeenCalledWith(failedResponse, 'Health check failed');

    warnSpy.mockRestore();
  });
});
