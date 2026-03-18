import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { UAParser } from 'ua-parser-js';
import { SESSION_MAX_AGE_MS, SESSION_MAX_SESSIONS } from './constants';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  parseDeviceName(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    const parts: string[] = [];
    if (browser.name) {
      parts.push(
        browser.version ? `${browser.name} ${browser.version}` : browser.name,
      );
    }
    if (os.name) {
      parts.push(os.version ? `${os.name} ${os.version}` : os.name);
    }

    return parts.length > 0 ? parts.join(' on ') : undefined;
  }

  async createSession(
    data: {
      id?: string;
      userId: string;
      hashedRefreshToken: string;
      userAgent?: string;
      ipAddress?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const doWork = async (client: Prisma.TransactionClient) => {
      // Enforce session cap
      const sessions = await client.session.findMany({
        where: { userId: data.userId },
        orderBy: { lastUsedAt: 'asc' },
        select: { id: true },
      });

      if (sessions.length >= SESSION_MAX_SESSIONS) {
        const toDelete = sessions.slice(
          0,
          sessions.length - SESSION_MAX_SESSIONS + 1,
        );
        await client.session.deleteMany({
          where: { id: { in: toDelete.map((s) => s.id) } },
        });
      }

      return client.session.create({
        data: {
          ...(data.id && { id: data.id }),
          userId: data.userId,
          refreshToken: data.hashedRefreshToken,
          deviceName: this.parseDeviceName(data.userAgent),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
        },
      });
    };

    return tx
      ? doWork(tx)
      : this.prisma.$transaction((txClient) => doWork(txClient));
  }

  async findById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  async touchSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async deleteAllSessions(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.session.deleteMany({
      where: { userId },
    });
  }

  async deleteOtherSessions(
    userId: string,
    currentSessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.session.deleteMany({
      where: { userId, id: { not: currentSessionId } },
    });
  }

  async listUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async deleteSessionForUser(sessionId: string, userId: string) {
    const { count } = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return count;
  }

  async deleteExpiredSessions() {
    return this.prisma.session.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }
}
