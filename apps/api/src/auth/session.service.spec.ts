import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockPrismaService = {
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseDeviceName', () => {
    it('should parse Chrome on Windows', () => {
      const result = service.parseDeviceName(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      expect(result).toContain('Chrome');
      expect(result).toContain('Windows');
    });

    it('should parse Firefox on Linux', () => {
      const result = service.parseDeviceName(
        'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
      );
      expect(result).toContain('Firefox');
      expect(result).toContain('Linux');
    });

    it('should parse Safari on macOS', () => {
      const result = service.parseDeviceName(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      );
      expect(result).toContain('Safari');
      expect(result).toContain('macOS');
    });

    it('should return undefined for undefined input', () => {
      expect(service.parseDeviceName(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(service.parseDeviceName('')).toBeUndefined();
    });
  });

  describe('createSession', () => {
    it('should create a session when under cap', async () => {
      mockPrismaService.session.findMany.mockResolvedValue([]);

      mockPrismaService.session.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.createSession({
        id: 'session-1',
        userId: 'user-1',
        hashedRefreshToken: 'hashed-token',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual({ id: 'session-1' });

      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          id: 'session-1',
          userId: 'user-1',
          refreshToken: 'hashed-token',
          ipAddress: '127.0.0.1',
        }),
      });

      expect(mockPrismaService.session.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete oldest sessions when at cap', async () => {
      const existingSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
      }));

      mockPrismaService.session.findMany.mockResolvedValue(existingSessions);

      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 1 });

      mockPrismaService.session.create.mockResolvedValue({ id: 'new-session' });

      await service.createSession({
        userId: 'user-1',
        hashedRefreshToken: 'hashed-token',
      });

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-0'] } },
      });
    });
  });

  describe('findById', () => {
    it('should find session by id', async () => {
      const session = { id: 'session-1', userId: 'user-1' };

      mockPrismaService.session.findUnique.mockResolvedValue(session);

      const result = await service.findById('session-1');

      expect(result).toEqual(session);

      expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });
  });

  describe('touchSession', () => {
    it('should update lastUsedAt', async () => {
      mockPrismaService.session.update.mockResolvedValue({ id: 'session-1' });

      await service.touchSession('session-1');

      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      mockPrismaService.session.delete.mockResolvedValue({ id: 'session-1' });

      await service.deleteSession('session-1');

      expect(mockPrismaService.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });
  });

  describe('deleteAllSessions', () => {
    it('should delete all sessions for user', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 3 });

      await service.deleteAllSessions('user-1');

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('listUserSessions', () => {
    it('should list non-expired sessions ordered by lastUsedAt', async () => {
      const sessions = [{ id: 'session-1' }, { id: 'session-2' }];

      mockPrismaService.session.findMany.mockResolvedValue(sessions);

      const result = await service.listUserSessions('user-1');

      expect(result).toEqual(sessions);

      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresAt: { gt: expect.any(Date) },
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
    });
  });

  describe('deleteSessionForUser', () => {
    it('should delete session only if owned by user', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteSessionForUser('session-1', 'user-1');

      expect(result).toBe(1);

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-1', userId: 'user-1' },
      });
    });

    it('should return 0 if session not owned by user', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteSessionForUser(
        'session-1',
        'other-user',
      );

      expect(result).toBe(0);
    });
  });

  describe('deleteExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 2 });

      await service.deleteExpiredSessions();

      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { expiresAt: { lte: expect.any(Date) } },
      });
    });
  });
});
