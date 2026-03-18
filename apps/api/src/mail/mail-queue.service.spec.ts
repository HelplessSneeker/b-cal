import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MailQueueService } from './mail-queue.service';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MAIL_JOB_SEND } from './mail-job.types';

const mockQueue = {
  add: jest.fn(),
};

describe('MailQueueService', () => {
  let service: MailQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailQueueService,
        { provide: getQueueToken(MAIL_QUEUE_NAME), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MailQueueService>(MailQueueService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueVerificationEmail', () => {
    it('should add a verification job to the queue', async () => {
      await service.enqueueVerificationEmail('user@example.com', 'token-123');

      expect(mockQueue.add).toHaveBeenCalledWith(MAIL_JOB_SEND, {
        type: 'verification',
        email: 'user@example.com',
        token: 'token-123',
      });
    });
  });

  describe('enqueuePasswordResetEmail', () => {
    it('should add a password-reset job to the queue', async () => {
      await service.enqueuePasswordResetEmail('user@example.com', 'reset-456');

      expect(mockQueue.add).toHaveBeenCalledWith(MAIL_JOB_SEND, {
        type: 'password-reset',
        email: 'user@example.com',
        token: 'reset-456',
      });
    });
  });
});
