import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheShutdownService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async onModuleDestroy() {
    try {
      for (const store of this.cache.stores) {
        const s = store as unknown as { disconnect?: () => Promise<void> };
        if (typeof s.disconnect === 'function') {
          await s.disconnect();
        }
      }
      this.logger.log('Cache store(s) disconnected');
    } catch (error) {
      this.logger.warn('Failed to disconnect cache store', error);
    }
  }
}
