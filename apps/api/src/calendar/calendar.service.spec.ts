import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from 'src/prisma/prisma.service';

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
};

const mockPrismaService = {
  calendarEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
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
  });

  describe('findAll', () => {
    it('should return all entries for user without date filters', async () => {
      const entries = [mockCalendarEntry];
      mockPrismaService.calendarEntry.findMany.mockResolvedValue(entries);

      await service.findAll('user-1', {});

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should apply startDate filter when provided', async () => {
      const startDate = '2026-01-01';
      mockPrismaService.calendarEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { startDate });

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          endDate: { gte: startDate },
        },
      });
    });

    it('should apply endDate filter when provided', async () => {
      const endDate = '2026-01-31';
      mockPrismaService.calendarEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { endDate });

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          startDate: { lte: endDate },
        },
      });
    });

    it('should apply both date filters when provided', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';
      mockPrismaService.calendarEntry.findMany.mockResolvedValue([]);

      await service.findAll('user-1', { startDate, endDate });

      expect(mockPrismaService.calendarEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          endDate: { gte: startDate },
          startDate: { lte: endDate },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return entry when found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );

      const result = await service.findOne('user-1', 'entry-1');

      expect(result).toEqual(mockCalendarEntry);
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
        'Calendar entry with id nonexistent not found',
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

      const result = await service.update('user-1', 'entry-1', updateDto);

      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.calendarEntry.update).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'entry-1' },
        data: { ...updateDto, updatedAt: expect.any(Date) },
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
      ).rejects.toThrow('startDate must be before or equal to endDate');
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
  });

  describe('remove', () => {
    it('should remove entry when found', async () => {
      mockPrismaService.calendarEntry.findUnique.mockResolvedValue(
        mockCalendarEntry,
      );
      mockPrismaService.calendarEntry.delete.mockResolvedValue(
        mockCalendarEntry,
      );

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
  });
});
