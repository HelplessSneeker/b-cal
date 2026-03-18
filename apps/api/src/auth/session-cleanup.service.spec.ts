import { Test, TestingModule } from '@nestjs/testing';
import { SessionCleanupService } from './session-cleanup.service';
import { SessionService } from './session.service';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let sessionService: { deleteExpiredSessions: jest.Mock };

  beforeEach(async () => {
    sessionService = {
      deleteExpiredSessions: jest.fn().mockResolvedValue({ count: 3 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCleanupService,
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get<SessionCleanupService>(SessionCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call deleteExpiredSessions', async () => {
    await service.handleExpiredSessions();

    expect(sessionService.deleteExpiredSessions).toHaveBeenCalled();
  });

  it('should not throw when deleteExpiredSessions fails', async () => {
    sessionService.deleteExpiredSessions.mockRejectedValue(
      new Error('DB error'),
    );

    await expect(service.handleExpiredSessions()).resolves.not.toThrow();
  });
});
