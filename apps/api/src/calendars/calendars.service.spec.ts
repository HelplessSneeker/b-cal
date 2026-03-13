import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CalendarColor } from './enums/calendar-color.enum';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockCalendar = {
  id: 'cal-1',
  userId: 'user-1',
  name: 'Work',
  color: CalendarColor.TEAL,
  createdAt: new Date('2026-01-01'),
  updatedAt: null,
};

const mockPrismaService = {
  calendar: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  calendarEntry: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('CalendarsService', () => {
  let service: CalendarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CalendarsService>(CalendarsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a calendar', async () => {
      const createDto = { name: 'Work', color: CalendarColor.TEAL };
      mockPrismaService.calendar.count.mockResolvedValue(0);
      mockPrismaService.calendar.create.mockResolvedValue(mockCalendar);

      const result = await service.create('user-1', createDto);

      expect(result).toEqual(mockCalendar);
      expect(mockPrismaService.calendar.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...createDto },
      });
    });

    it('should throw BadRequestException when max calendars reached', async () => {
      mockPrismaService.calendar.count.mockResolvedValue(5);

      await expect(
        service.create('user-1', {
          name: 'Too Many',
          color: CalendarColor.RED,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create('user-1', {
          name: 'Too Many',
          color: CalendarColor.RED,
        }),
      ).rejects.toThrow('error.maxCalendarsReached');
    });
  });

  describe('findAll', () => {
    it('should return all calendars for user', async () => {
      mockPrismaService.calendar.findMany.mockResolvedValue([mockCalendar]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([mockCalendar]);
      expect(mockPrismaService.calendar.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return calendar when found', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(mockCalendar);

      const result = await service.findOne('user-1', 'cal-1');

      expect(result).toEqual(mockCalendar);
    });

    it('should throw NotFoundException when calendar not found', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('user-1', 'nonexistent')).rejects.toThrow(
        'error.calendarNotFound',
      );
    });
  });

  describe('update', () => {
    it('should update a calendar', async () => {
      const updatedCalendar = { ...mockCalendar, name: 'Personal' };
      mockPrismaService.calendar.findUnique.mockResolvedValue(mockCalendar);
      mockPrismaService.calendar.update.mockResolvedValue(updatedCalendar);

      const result = await service.update('user-1', 'cal-1', {
        name: 'Personal',
      });

      expect(result).toEqual(updatedCalendar);
      expect(mockPrismaService.calendar.update).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'cal-1' },
        data: { name: 'Personal' },
      });
    });

    it('should throw NotFoundException when calendar not found', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete calendar and nullify entries by default', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(mockCalendar);
      mockPrismaService.calendar.delete.mockResolvedValue(mockCalendar);

      await service.remove('user-1', 'cal-1');

      expect(mockPrismaService.calendar.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: 'cal-1' },
      });
    });

    it('should delete calendar and entries when deleteEntries is true', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(mockCalendar);
      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async (fn: (tx: unknown) => unknown) =>
          fn({
            calendarEntry: {
              deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
            calendar: {
              delete: jest.fn().mockResolvedValue(mockCalendar),
            },
          }),
      );

      await service.remove('user-1', 'cal-1', true);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when calendar not found', async () => {
      mockPrismaService.calendar.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
