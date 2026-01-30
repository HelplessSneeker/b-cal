import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

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
};

const mockCalendarService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CalendarController', () => {
  let controller: CalendarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: mockCalendarService }],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a calendar entry and return message', async () => {
      const createDto = {
        title: 'Test Event',
        startDate: '2026-01-15',
        endDate: '2026-01-16',
        content: 'Test content',
      };
      mockCalendarService.create.mockResolvedValue(mockCalendarEntry);

      const result = await controller.create('user-1', createDto);

      expect(result).toEqual({
        message: 'Calendar entry with id entry-1 created',
      });
      expect(mockCalendarService.create).toHaveBeenCalledWith('user-1', createDto);
    });
  });

  describe('findAll', () => {
    it('should return all calendar entries', async () => {
      const entries = [mockCalendarEntry];
      mockCalendarService.findAll.mockResolvedValue(entries);

      const result = await controller.findAll('user-1', {});

      expect(result).toEqual({ data: entries });
      expect(mockCalendarService.findAll).toHaveBeenCalledWith('user-1', {});
    });

    it('should pass date filters to service', async () => {
      const queryDto = { startDate: '2026-01-01', endDate: '2026-01-31' };
      mockCalendarService.findAll.mockResolvedValue([]);

      await controller.findAll('user-1', queryDto);

      expect(mockCalendarService.findAll).toHaveBeenCalledWith('user-1', queryDto);
    });
  });

  describe('findOne', () => {
    it('should return a single calendar entry', async () => {
      mockCalendarService.findOne.mockResolvedValue(mockCalendarEntry);

      const result = await controller.findOne('user-1', 'entry-1');

      expect(result).toEqual({ data: mockCalendarEntry });
      expect(mockCalendarService.findOne).toHaveBeenCalledWith('user-1', 'entry-1');
    });
  });

  describe('update', () => {
    it('should update a calendar entry and return message', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedEntry = { ...mockCalendarEntry, title: 'Updated Title' };
      mockCalendarService.update.mockResolvedValue(updatedEntry);

      const result = await controller.update('user-1', 'entry-1', updateDto);

      expect(result).toEqual({
        message: 'Calander entry with id entry-1 has been updated',
      });
      expect(mockCalendarService.update).toHaveBeenCalledWith(
        'user-1',
        'entry-1',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a calendar entry and return message', async () => {
      mockCalendarService.remove.mockResolvedValue(mockCalendarEntry);

      const result = await controller.remove('user-1', 'entry-1');

      expect(result).toEqual({
        message: 'Deletd Calendar entry with id entry-1',
      });
      expect(mockCalendarService.remove).toHaveBeenCalledWith('user-1', 'entry-1');
    });
  });
});
