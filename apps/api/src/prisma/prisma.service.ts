import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env['DB_HOST']}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public`;

    super({
      adapter: new PrismaPg(
        {
          connectionString,
          max: parseInt(process.env.DB_POOL_MAX || '10', 10),
          idleTimeoutMillis: parseInt(
            process.env.DB_POOL_IDLE_TIMEOUT_MS || '10000',
            10,
          ),
          connectionTimeoutMillis: parseInt(
            process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000',
            10,
          ),
        },
        {
          schema: 'public',
        },
      ),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRawUnsafe('SELECT 1');
    } catch (error) {
      const host = process.env['DB_HOST'];
      const port = process.env.DB_PORT;
      console.error(
        `\n[PrismaService] Failed to connect to database at ${host}:${port}. Is PostgreSQL running?\n`,
      );
      throw error;
    }
    const poolMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
    this.logger.log(`Database connected (pool max: ${poolMax})`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
