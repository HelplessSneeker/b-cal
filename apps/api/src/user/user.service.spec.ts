import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockPrismaModule = {
  PrismaService: jest.fn(),
};
jest.mock('src/prisma/prisma.service', () => mockPrismaModule);

import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed-password',
};

const mockPreferences = {
  userId: 'user-1',
  language: 'en-US',
  timezone: 'America/New_York',
  theme: 'system',
  accentColor: 'blue',
  weekStart: 'monday',
  createdAt: new Date(),
  updatedAt: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userPreferences: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const input = {
        email: 'new@example.com',
        password: 'hashed',
        verificationToken: 'token',
      };
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-2',
        ...input,
      });

      const result = await service.create(input);

      expect(result).toEqual({ id: 'user-2', ...input });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('deleteUser', () => {
    it('should delete the user by id', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await service.deleteUser('user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should invalidate preferences cache after deletion', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await service.deleteUser('user-1');

      expect(mockCache.del).toHaveBeenCalledWith('user-prefs:user-1');
    });

    it('should not throw when cache deletion fails', async () => {
      mockPrisma.user.delete.mockResolvedValue(mockUser);
      mockCache.del.mockRejectedValue(new Error('Redis down'));

      await expect(service.deleteUser('user-1')).resolves.not.toThrow();
    });
  });

  describe('findPreferences', () => {
    it('should return cached preferences on cache hit', async () => {
      mockCache.get.mockResolvedValue(mockPreferences);

      const result = await service.findPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(mockCache.get).toHaveBeenCalledWith('user-prefs:user-1');
      expect(mockPrisma.userPreferences.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache on cache miss', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.findPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        'user-prefs:user-1',
        mockPreferences,
      );
    });

    it('should not cache null preferences', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      const result = await service.findPreferences('user-1');

      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should fall back to DB when cache read fails', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis down'));
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.findPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalled();
    });

    it('should still return data when cache write fails', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      mockCache.set.mockRejectedValue(new Error('Redis down'));

      const result = await service.findPreferences('user-1');

      expect(result).toEqual(mockPreferences);
    });
  });

  describe('upsertPreferences', () => {
    const data = {
      language: 'de-DE',
      timezone: 'Europe/Berlin',
      theme: 'dark',
      accentColor: 'indigo',
      weekStart: 'sunday',
    };

    it('should upsert preferences for a user', async () => {
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        ...data,
      });

      const result = await service.upsertPreferences('user-1', data);

      expect(result).toEqual({ userId: 'user-1', ...data });
      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', ...data },
        update: data,
      });
    });

    it('should invalidate preferences cache after upsert', async () => {
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        ...data,
      });

      await service.upsertPreferences('user-1', data);

      expect(mockCache.del).toHaveBeenCalledWith('user-prefs:user-1');
    });

    it('should not throw when cache invalidation fails', async () => {
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        ...data,
      });
      mockCache.del.mockRejectedValue(new Error('Redis down'));

      await expect(
        service.upsertPreferences('user-1', data),
      ).resolves.not.toThrow();
    });
  });

  describe('findByIdWithPreferences', () => {
    it('should return user with cached preferences', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCache.get.mockResolvedValue(mockPreferences);

      const result = await service.findByIdWithPreferences('user-1');

      expect(result).toEqual({ ...mockUser, preferences: mockPreferences });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      // Preferences served from cache, not from a Prisma join
      expect(mockPrisma.userPreferences.findUnique).not.toHaveBeenCalled();
    });

    it('should return user with null preferences on cache miss', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      const result = await service.findByIdWithPreferences('user-1');

      expect(result).toEqual({ ...mockUser, preferences: null });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByIdWithPreferences('nonexistent');

      expect(result).toBeNull();
    });
  });
});
