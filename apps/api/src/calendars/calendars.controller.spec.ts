import { Test, TestingModule } from '@nestjs/testing';
import { CalendarsController } from './calendars.controller';
import { CalendarsService } from './calendars.service';
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

const mockCalendarsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CalendarsController', () => {
  let controller: CalendarsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarsController],
      providers: [
        { provide: CalendarsService, useValue: mockCalendarsService },
      ],
    }).compile();

    controller = module.get<CalendarsController>(CalendarsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a calendar and return message', async () => {
      const createDto = { name: 'Work', color: CalendarColor.TEAL };
      mockCalendarsService.create.mockResolvedValue(mockCalendar);

      const result = await controller.create('user-1', createDto);

      expect(result).toEqual({
        message: 'success.calendarCreated',
        data: mockCalendar,
      });
      expect(mockCalendarsService.create).toHaveBeenCalledWith(
        'user-1',
        createDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all calendars', async () => {
      mockCalendarsService.findAll.mockResolvedValue([mockCalendar]);

      const result = await controller.findAll('user-1');

      expect(result).toEqual({ data: [mockCalendar] });
      expect(mockCalendarsService.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should return a single calendar', async () => {
      mockCalendarsService.findOne.mockResolvedValue(mockCalendar);

      const result = await controller.findOne('user-1', 'cal-1');

      expect(result).toEqual({ data: mockCalendar });
      expect(mockCalendarsService.findOne).toHaveBeenCalledWith(
        'user-1',
        'cal-1',
      );
    });
  });

  describe('update', () => {
    it('should update a calendar and return message', async () => {
      const updatedCalendar = { ...mockCalendar, name: 'Personal' };
      mockCalendarsService.update.mockResolvedValue(updatedCalendar);

      const result = await controller.update('user-1', 'cal-1', {
        name: 'Personal',
      });

      expect(result).toEqual({
        message: 'success.calendarUpdated',
        data: updatedCalendar,
      });
    });
  });

  describe('remove', () => {
    it('should remove a calendar and return message', async () => {
      mockCalendarsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('user-1', 'cal-1', {});

      expect(result).toEqual({
        message: 'success.calendarDeleted',
      });
      expect(mockCalendarsService.remove).toHaveBeenCalledWith(
        'user-1',
        'cal-1',
        undefined,
      );
    });

    it('should pass deleteEntries flag to service', async () => {
      mockCalendarsService.remove.mockResolvedValue(undefined);

      await controller.remove('user-1', 'cal-1', { deleteEntries: true });

      expect(mockCalendarsService.remove).toHaveBeenCalledWith(
        'user-1',
        'cal-1',
        true,
      );
    });
  });
});
