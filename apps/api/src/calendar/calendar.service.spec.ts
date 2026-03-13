import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditScope } from './enums/edit-scope.enum';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockCalendarEntry = {
  id: 'entry-1',
  userId: 'user-1',
  title: 'Test Event',
  startDate: new Date('2026-01-15'),
  endDate: new Date('2026-01-16'),
  content: 'Test content',
  wholeDay: false,
  calendarId: null,
  recurrenceFrequency: null,
  recurrenceByDay: null,
  recurrenceUntil: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: null,
};

const RECURRING_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockRecurringEntry = {
  id: RECURRING_UUID,
  userId: 'user-1',
  title: 'Daily Standup',
  startDate: new Date('2026-03-01T09:00:00.000Z'),
  endDate: new Date('2026-03-01T09:30:00.000Z'),
  content: 'Team sync',
  wholeDay: false,
  calendarId: null,
  recurrenceFrequency: 'DAILY',
  recurrenceByDay: null,
  recurrenceUntil: new Date('2026-03-05T09:00:00.000Z'),
  createdAt: new Date('2026-03-01'),
  updatedAt: null,
  recurrenceExceptions: [],
};

const mockPrismaService = {
  calendarEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recurrenceException: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  calendar: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a calendar entry', async () => {
      const createDto = {
        title: 'Test Event',
        startDate: '2026-01-15',
        endDate: '2026-01-16',
        content: 'Test content',
      };
      mockPrismaService.calendarEntry.create.mockResolvedValue(
        mockCalendarEntry,
      );

      const result = await service.create('user-1', createDto);

      expect(result).toEqual(mockCalendarEntry);
      expect(mockPrismaService.calendarEntry.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          ...createDto,
        },
      });
    });

    it('should create a recurring calendar entry', async () => {
      const createDto = {
        title: 'Daily Standup',
        startDate: '2026-03-01T09:00:00.000Z',
        endDate: '2026-03-01T09:30:00.000Z',
        recurrenceFrequency: 'DAILY' as const,
        recurrenceUntil: '2026-03-31T09:00:00.000Z',
      };
      mockPrismaService.calendarEntry.create.mockResolvedValue({
        ...mockRecurringEntry,
        ...createDto,
      });

      const result = await service.create('user-1', createDto);

      expect(result.recurrenceFrequency).toBe('DAILY');
    });
  });

  describe('findAll', () => {
    it('should return all entries for user without date filters', async () => {
      mockPrismaService.calendarEntry.findMany
        .mockResolvedValueOnce([mockCalendarEntry]) // non-recurring
        .mockResolvedValueOnce([]); // recurring

      await service.findAll('user-1', {});

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledTimes(2);
    });

    it('should apply startDate filter when provided', async () => {
      const startDate = '2026-01-01';
      mockPrismaService.calendarEntry.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.findAll('user-1', { startDate });

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledTimes(2);
    });

    it('should apply endDate filter when provided', async () => {
      const endDate = '2026-01-31';
      mockPrismaService.calendarEntry.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.findAll('user-1', { endDate });

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledTimes(2);
    });

    it('should expand recurring entries into virtual occurrences', async () => {
      mockPrismaService.calendarEntry.findMany
        .mockResolvedValueOnce([]) // non-recurring
        .mockResolvedValueOnce([mockRecurringEntry]); // recurring

      const result = await service.findAll('user-1', {
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-05T23:59:59.000Z',
      });

      expect(result.length).toBe(5); // 5 daily occurrences
      expect(result[0].isRecurring).toBe(true);
    });

    it('should augment non-recurring entries with recurrence fields', async () => {
      mockPrismaService.calendarEntry.findMany
        .mockResolvedValueOnce([mockCalendarEntry])
        .mockResolvedValueOnce([]);

      const result = await service.findAll('user-1', {});

      expect(result[0].isRecurring).toBe(false);
      expect(result[0].originalDate).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return entry when found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );

      const result = await service.findOne('user-1', 'entry-1');

      expect(result.id).toBe('entry-1');
      expect(mockPrismaService.calendarEntry.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'entry-1' },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(
        'error.calendarEntryNotFound',
      );
    });

    it('should handle synthetic IDs for recurring occurrences', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockRecurringEntry,
      );

      const syntheticId = `${RECURRING_UUID}:2026-03-02T09:00:00.000Z`;
      const result = await service.findOne('user-1', syntheticId);

      expect(result.isRecurring).toBe(true);
      expect(result.originalDate).toEqual(new Date('2026-03-02T09:00:00.000Z'));
    });

    it('should throw NotFoundException for cancelled occurrence', async () => {
      const entryWithExceptions = {
        ...mockRecurringEntry,
        recurrenceExceptions: [
          {
            originalDate: new Date('2026-03-02T09:00:00.000Z'),
            isCancelled: true,
          },
        ],
      };
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        entryWithExceptions,
      );

      const syntheticId = `${RECURRING_UUID}:2026-03-02T09:00:00.000Z`;
      await expect(service.findOne('user-1', syntheticId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update entry when found', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedEntry = { ...mockCalendarEntry, title: 'Updated Title' };
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );
      mockPrismaService.calendarEntry.update.mockResolvedValue(updatedEntry);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await service.update('user-1', 'entry-1', updateDto);

      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.calendarEntry.update).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'entry-1' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'nonexistent', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when startDate is after endDate', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );

      await expect(
        service.update('user-1', 'entry-1', {
          startDate: '2026-01-20',
          endDate: '2026-01-10',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('user-1', 'entry-1', {
          startDate: '2026-01-20',
          endDate: '2026-01-10',
        }),
      ).rejects.toThrow('error.startDateBeforeEndDate');
    });

    it('should validate dates using existing entry values when partial update', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue({
        ...mockCalendarEntry,
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-16'),
      });

      await expect(
        service.update('user-1', 'entry-1', { startDate: '2026-01-20' }),
      ).rejects.toThrow(BadRequestException);
    });

    describe('recurring entry update', () => {
      it('should update all occurrences with scope ALL', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        const updatedEntry = { ...mockRecurringEntry, title: 'New Title' };
        mockPrismaService.$transaction.mockImplementation(
          // eslint-disable-next-line @typescript-eslint/require-await
          async (fn: (tx: unknown) => unknown) =>
            fn({
              calendarEntry: {
                update: jest.fn().mockResolvedValue(updatedEntry),
              },
              recurrenceException: {
                deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              },
            }),
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = await service.update('user-1', RECURRING_UUID, {
          title: 'New Title',
          scope: EditScope.ALL,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(result.title).toBe('New Title');
      });

      it('should preserve parent dates when editing via synthetic ID with scope ALL', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        const mockUpdate = jest.fn().mockResolvedValue(mockRecurringEntry);
        const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
        mockPrismaService.$transaction.mockImplementation(
          // eslint-disable-next-line @typescript-eslint/require-await
          async (fn: (tx: unknown) => unknown) =>
            fn({
              calendarEntry: { update: mockUpdate },
              recurrenceException: { deleteMany: mockDeleteMany },
            }),
        );

        // Edit the March 15 occurrence but with ALL scope — should not shift parent
        const syntheticId = `${RECURRING_UUID}:2026-03-15T09:00:00.000Z`;
        await service.update('user-1', syntheticId, {
          title: 'Renamed',
          startDate: '2026-03-15T09:00:00.000Z',
          endDate: '2026-03-15T09:30:00.000Z',
          scope: EditScope.ALL,
        });

        // Parent startDate should remain March 1, not shift to March 15
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const updateCall = mockUpdate.mock.calls[0][0];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(updateCall.data.startDate).toEqual(
          new Date('2026-03-01T09:00:00.000Z'),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(updateCall.data.endDate).toEqual(
          new Date('2026-03-01T09:30:00.000Z'),
        );
        // Dates did not actually change, so exceptions should NOT be cleared
        expect(mockDeleteMany).not.toHaveBeenCalled();
      });

      it('should apply time-of-day change to parent when editing via synthetic ID with scope ALL', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        const mockUpdate = jest.fn().mockResolvedValue(mockRecurringEntry);
        const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
        mockPrismaService.$transaction.mockImplementation(
          // eslint-disable-next-line @typescript-eslint/require-await
          async (fn: (tx: unknown) => unknown) =>
            fn({
              calendarEntry: { update: mockUpdate },
              recurrenceException: { deleteMany: mockDeleteMany },
            }),
        );

        // Edit the March 15 occurrence: shift time from 9:00-9:30 to 10:00-10:30
        const syntheticId = `${RECURRING_UUID}:2026-03-15T09:00:00.000Z`;
        await service.update('user-1', syntheticId, {
          title: 'Daily Standup',
          startDate: '2026-03-15T10:00:00.000Z',
          endDate: '2026-03-15T10:30:00.000Z',
          scope: EditScope.ALL,
        });

        // Parent should shift from 9:00-9:30 to 10:00-10:30 (keeping March 1 date)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const updateCall = mockUpdate.mock.calls[0][0];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(updateCall.data.startDate).toEqual(
          new Date('2026-03-01T10:00:00.000Z'),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(updateCall.data.endDate).toEqual(
          new Date('2026-03-01T10:30:00.000Z'),
        );
        // Dates changed, so exceptions should be cleared
        expect(mockDeleteMany).toHaveBeenCalled();
      });

      it('should create exception for scope SINGLE with synthetic ID', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        const exception = {
          calendarEntryId: RECURRING_UUID,
          originalDate: new Date('2026-03-02T09:00:00.000Z'),
          title: 'Modified Standup',
          isCancelled: false,
        };
        mockPrismaService.recurrenceException.upsert.mockResolvedValue(
          exception,
        );

        const id = `${RECURRING_UUID}:2026-03-02T09:00:00.000Z`;
        await service.update('user-1', id, {
          title: 'Modified Standup',
          scope: EditScope.SINGLE,
        });

        expect(mockPrismaService.recurrenceException.upsert).toHaveBeenCalled();
      });
    });
  });

  describe('remove', () => {
    it('should remove entry when found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );
      mockPrismaService.calendarEntry.delete.mockResolvedValue(
        mockCalendarEntry,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await service.remove('user-1', 'entry-1');

      expect(result).toEqual(mockCalendarEntry);
      expect(mockPrismaService.calendarEntry.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'entry-1' },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    describe('recurring entry removal', () => {
      it('should delete parent with scope ALL', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        mockPrismaService.calendarEntry.delete.mockResolvedValue(
          mockRecurringEntry,
        );

        await service.remove('user-1', RECURRING_UUID, EditScope.ALL);

        expect(mockPrismaService.calendarEntry.delete).toHaveBeenCalledWith({
          where: { userId: 'user-1', id: RECURRING_UUID },
        });
      });

      it('should cancel single occurrence with scope SINGLE', async () => {
        mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
          mockRecurringEntry,
        );
        mockPrismaService.recurrenceException.upsert.mockResolvedValue({
          isCancelled: true,
        });

        const syntheticId = `${RECURRING_UUID}:2026-03-02T09:00:00.000Z`;
        await service.remove('user-1', syntheticId, EditScope.SINGLE);

        expect(mockPrismaService.recurrenceException.upsert).toHaveBeenCalled();
      });
    });
  });
});
