import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';
import { Job } from 'bullmq';
import { MailJobData } from './mail-job.types';

const mockMailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendReminderEmail: jest.fn(),
};

function createMockJob(data: MailJobData): Job<MailJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<MailJobData>;
}

describe('MailProcessor', () => {
  let processor: MailProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should call sendVerificationEmail for verification jobs', async () => {
    const job = createMockJob({
      type: 'verification',
      email: 'user@example.com',
      token: 'verify-token',
    });

    await processor.process(job);

    expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      'verify-token',
      undefined,
      undefined,
    );
    expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should call sendPasswordResetEmail for password-reset jobs', async () => {
    const job = createMockJob({
      type: 'password-reset',
      email: 'user@example.com',
      token: 'reset-token',
    });

    await processor.process(job);

    expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'reset-token',
      undefined,
      undefined,
    );
    expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('should forward theme and accentColor for verification jobs', async () => {
    const job = createMockJob({
      type: 'verification',
      email: 'user@example.com',
      token: 'verify-token',
      theme: 'dark',
      accentColor: 'violet',
    });

    await processor.process(job);

    expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      'verify-token',
      'dark',
      'violet',
    );
  });

  it('should forward theme and accentColor for reminder jobs', async () => {
    const job = createMockJob({
      type: 'reminder',
      email: 'user@example.com',
      title: 'Meeting',
      startDate: '2026-03-20T10:00:00Z',
      theme: 'dark',
      accentColor: 'emerald',
    });

    await processor.process(job);

    expect(mockMailService.sendReminderEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Meeting',
      '2026-03-20T10:00:00Z',
      'dark',
      'emerald',
    );
  });

  it('should re-throw errors so BullMQ retries', async () => {
    const error = new Error('SMTP connection failed');
    mockMailService.sendVerificationEmail.mockRejectedValue(error);

    const job = createMockJob({
      type: 'verification',
      email: 'user@example.com',
      token: 'token',
    });

    await expect(processor.process(job)).rejects.toThrow(
      'SMTP connection failed',
    );
  });
});
