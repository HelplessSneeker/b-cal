import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    let result: HealthCheckResult;
    try {
      result = await this.health.check([
        () => this.db.pingCheck('database', this.prisma),
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        () =>
          this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
          }),
      ]);
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const response = (error as Error & { response: HealthCheckResult })
          .response;
        this.logger.warn(response, 'Health check failed');
      }
      throw new ServiceUnavailableException({ status: 'error' });
    }
    return { status: result.status };
  }
}
