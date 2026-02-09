import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  DiskHealthIndicator,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

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
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result', async () => {
    const result = await controller.check();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(healthCheckService.check).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Function)]),
    );
    expect(result.status).toBe('ok');
  });
});
