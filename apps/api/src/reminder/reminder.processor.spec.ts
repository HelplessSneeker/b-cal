import { Test, TestingModule } from '@nestjs/testing';
import { ReminderProcessor } from './reminder.processor';
import { ReminderService } from './reminder.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailQueueService } from 'src/mail/mail-queue.service';
import { UserService } from 'src/user/user.service';
import { Job } from 'bullmq';
import { ReminderJobData } from './reminder-job.types';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockReminderService = {
  findAndEnqueueDueReminders: jest.fn(),
};

const mockPrismaService = {
  reminderSent: {
    create: jest.fn(),
  },
};

const mockMailQueueService = {
  enqueueReminderEmail: jest.fn(),
};

const mockUserService = {
  findPreferences: jest.fn(),
};

function createMockJob(data: ReminderJobData): Job<ReminderJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<ReminderJobData>;
}

describe('ReminderProcessor', () => {
  let processor: ReminderProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderProcessor,
        { provide: ReminderService, useValue: mockReminderService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailQueueService, useValue: mockMailQueueService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    processor = module.get<ReminderProcessor>(ReminderProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should call findAndEnqueueDueReminders for poll jobs', async () => {
    const job = createMockJob({ type: 'poll' });

    await processor.process(job);

    expect(mockReminderService.findAndEnqueueDueReminders).toHaveBeenCalled();
  });

  it('should create ReminderSent record, fetch preferences, and enqueue email for send jobs', async () => {
    mockPrismaService.reminderSent.create.mockResolvedValue({});
    mockUserService.findPreferences.mockResolvedValue({
      theme: 'dark',
      accentColor: 'emerald',
    });
    mockMailQueueService.enqueueReminderEmail.mockResolvedValue(undefined);

    const job = createMockJob({
      type: 'send',
      calendarEntryId: 'entry-1',
      occurrenceDate: '2026-03-20T10:00:00.000Z',
      userId: 'user-1',
      email: 'user@example.com',
      title: 'Team Meeting',
      startDate: '2026-03-20T10:00:00.000Z',
    });

    await processor.process(job);

    expect(mockPrismaService.reminderSent.create).toHaveBeenCalledWith({
      data: {
        calendarEntryId: 'entry-1',
        occurrenceDate: new Date('2026-03-20T10:00:00.000Z'),
      },
    });
    expect(mockUserService.findPreferences).toHaveBeenCalledWith('user-1');
    expect(mockMailQueueService.enqueueReminderEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Team Meeting',
      '2026-03-20T10:00:00.000Z',
      'dark',
      'emerald',
    );
  });

  it('should skip sending if reminder was already sent (P2002)', async () => {
    const error = { code: 'P2002' };
    mockPrismaService.reminderSent.create.mockRejectedValue(error);

    const job = createMockJob({
      type: 'send',
      calendarEntryId: 'entry-1',
      occurrenceDate: '2026-03-20T10:00:00.000Z',
      userId: 'user-1',
      email: 'user@example.com',
      title: 'Team Meeting',
      startDate: '2026-03-20T10:00:00.000Z',
    });

    await processor.process(job);

    expect(mockMailQueueService.enqueueReminderEmail).not.toHaveBeenCalled();
    expect(mockUserService.findPreferences).not.toHaveBeenCalled();
  });

  it('should pass undefined theme/accentColor when user has no preferences', async () => {
    mockPrismaService.reminderSent.create.mockResolvedValue({});
    mockUserService.findPreferences.mockResolvedValue(null);
    mockMailQueueService.enqueueReminderEmail.mockResolvedValue(undefined);

    const job = createMockJob({
      type: 'send',
      calendarEntryId: 'entry-1',
      occurrenceDate: '2026-03-20T10:00:00.000Z',
      userId: 'user-1',
      email: 'user@example.com',
      title: 'Standup',
      startDate: '2026-03-20T10:00:00.000Z',
    });

    await processor.process(job);

    expect(mockMailQueueService.enqueueReminderEmail).toHaveBeenCalledWith(
      'user@example.com',
      'Standup',
      '2026-03-20T10:00:00.000Z',
      undefined,
      undefined,
    );
  });
});
