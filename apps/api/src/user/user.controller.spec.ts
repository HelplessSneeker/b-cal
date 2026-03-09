import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import * as express from 'express';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockUserService = {
  deleteUser: jest.fn(),
  findPreferences: jest.fn(),
  upsertPreferences: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delete', () => {
    it('should delete the user and return success message', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);
      const mockRes = { clearCookie: jest.fn() } as Partial<express.Response>;

      const result = await controller.delete(
        'user-1',
        mockRes as express.Response,
      );

      expect(result).toEqual({ message: 'success.userDeleted' });
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-1');
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(3);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const preferences = {
        userId: 'user-1',
        language: 'en-US',
        timezone: 'America/New_York',
        theme: 'system',
        accentColor: 'blue',
        weekStart: 'monday',
        density: 'default',
      };
      mockUserService.findPreferences.mockResolvedValue(preferences);

      const result = await controller.getPreferences('user-1');

      expect(result).toEqual({ data: preferences });
      expect(mockUserService.findPreferences).toHaveBeenCalledWith('user-1');
    });

    it('should return null data when no preferences exist', async () => {
      mockUserService.findPreferences.mockResolvedValue(null);

      const result = await controller.getPreferences('user-1');

      expect(result).toEqual({ data: null });
    });
  });

  describe('updatePreferences', () => {
    it('should create preferences when none exist and both fields provided', async () => {
      const dto = { language: 'en-US', timezone: 'America/New_York' };
      const expectedData = {
        ...dto,
        theme: 'system',
        accentColor: 'blue',
        weekStart: 'monday',
        density: 'default',
      };
      const created = { userId: 'user-1', ...expectedData };
      mockUserService.findPreferences.mockResolvedValue(null);
      mockUserService.upsertPreferences.mockResolvedValue(created);

      const result = await controller.updatePreferences('user-1', dto);

      expect(result).toEqual({
        message: 'success.preferencesUpdated',
        data: created,
      });
      expect(mockUserService.upsertPreferences).toHaveBeenCalledWith(
        'user-1',
        expectedData,
      );
    });

    it('should throw BadRequestException when creating without both fields', async () => {
      mockUserService.findPreferences.mockResolvedValue(null);

      await expect(
        controller.updatePreferences('user-1', { language: 'en-US' }),
      ).rejects.toThrow('error.preferencesRequired');
    });

    it('should update existing preferences with partial data', async () => {
      const existing = {
        userId: 'user-1',
        language: 'en-US',
        timezone: 'America/New_York',
        theme: 'system',
        accentColor: 'blue',
        weekStart: 'monday',
        density: 'default',
      };
      const updated = { ...existing, language: 'de-DE' };
      mockUserService.findPreferences.mockResolvedValue(existing);
      mockUserService.upsertPreferences.mockResolvedValue(updated);

      const result = await controller.updatePreferences('user-1', {
        language: 'de-DE',
      });

      expect(result).toEqual({
        message: 'success.preferencesUpdated',
        data: updated,
      });
      expect(mockUserService.upsertPreferences).toHaveBeenCalledWith('user-1', {
        language: 'de-DE',
        timezone: 'America/New_York',
        theme: 'system',
        accentColor: 'blue',
        weekStart: 'monday',
        density: 'default',
      });
    });
  });
});
