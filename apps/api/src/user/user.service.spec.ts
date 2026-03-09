import { Test, TestingModule } from '@nestjs/testing';

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
  density: 'default',
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

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
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
  });

  describe('findPreferences', () => {
    it('should return preferences for a user', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.findPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return null when no preferences exist', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      const result = await service.findPreferences('user-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertPreferences', () => {
    it('should upsert preferences for a user', async () => {
      const data = {
        language: 'de-DE',
        timezone: 'Europe/Berlin',
        theme: 'dark',
        accentColor: 'indigo',
        weekStart: 'sunday',
        density: 'compact',
      };
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
  });

  describe('findByIdWithPreferences', () => {
    it('should return user with preferences', async () => {
      const userWithPrefs = { ...mockUser, preferences: mockPreferences };
      mockPrisma.user.findUnique.mockResolvedValue(userWithPrefs);

      const result = await service.findByIdWithPreferences('user-1');

      expect(result).toEqual(userWithPrefs);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { preferences: true },
      });
    });

    it('should return user with null preferences', async () => {
      const userWithoutPrefs = { ...mockUser, preferences: null };
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPrefs);

      const result = await service.findByIdWithPreferences('user-1');

      expect(result).toEqual(userWithoutPrefs);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByIdWithPreferences('nonexistent');

      expect(result).toBeNull();
    });
  });
});
