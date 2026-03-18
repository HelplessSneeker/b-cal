import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const testKey = `health:${key}:probe`;
    try {
      await this.cache.set(testKey, 'ok', 5000);
      const value = await this.cache.get<string>(testKey);
      await this.cache.del(testKey);

      if (value !== 'ok') {
        throw new Error('Redis probe returned unexpected value');
      }

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
