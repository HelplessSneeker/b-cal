import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User, UserPreferences } from 'generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { t } from 'src/common/utils/i18n';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  private prefsCacheKey(userId: string): string {
    return `user-prefs:${userId}`;
  }

  async findOne(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(
    data: {
      email: string;
      password: string;
      verificationToken: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const user = await client.user.create({
      data,
    });
    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  async updateVerificationToken(id: string, verificationToken: string) {
    return this.prisma.user.update({
      where: { id },
      data: { verificationToken },
    });
  }

  async validateEmail(email: string, verificationToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const isMatch = user?.verificationToken
      ? await bcrypt.compare(verificationToken, user.verificationToken)
      : false;

    if (!user || !isMatch) {
      this.logger.error(
        `Email validation failed: invalid token for user ${user?.id ?? 'unknown'}`,
      );
      throw new BadRequestException(t('error.invalidOrExpiredToken'));
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: null,
        emailVerified: true,
      },
    });

    return user.id;
  }

  async setPasswordResetToken(email: string, token: string) {
    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
      },
    });
  }

  async changePassword(
    email: string,
    password: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const user = await this.findOne(email, tx);

    if (!user || !user.resetToken) {
      this.logger.error(
        `Password change failed: user not found or no reset token for ${email}`,
      );
      throw new BadRequestException(t('error.userNotFound'));
    }

    await client.user.update({
      where: {
        id: user.id,
      },
      data: {
        password,
        resetToken: null,
      },
    });
  }

  async updatePassword(
    userId: string,
    hashedPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });
    try {
      await this.cache.del(this.prefsCacheKey(userId));
    } catch (error) {
      this.logger.warn(`Failed to delete cache for user ${userId}`, error);
    }
  }

  async findPreferences(userId: string): Promise<UserPreferences | null> {
    const cacheKey = this.prefsCacheKey(userId);

    try {
      const cached = await this.cache.get<UserPreferences>(cacheKey);
      if (cached) return cached;
    } catch (error) {
      this.logger.warn('Failed to read preferences from cache', error);
    }

    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (prefs) {
      try {
        await this.cache.set(cacheKey, prefs);
      } catch (error) {
        this.logger.warn('Failed to write preferences to cache', error);
      }
    }

    return prefs;
  }

  async upsertPreferences(
    userId: string,
    data: {
      language: string;
      timezone: string;
      theme: string;
      accentColor: string;
      weekStart: string;
    },
  ): Promise<UserPreferences> {
    const result = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    try {
      await this.cache.del(this.prefsCacheKey(userId));
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate preferences cache for user ${userId}`,
        error,
      );
    }
    return result;
  }

  async findByIdWithPreferences(
    id: string,
  ): Promise<(User & { preferences: UserPreferences | null }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;

    const preferences = await this.findPreferences(id);
    return { ...user, preferences };
  }
}
