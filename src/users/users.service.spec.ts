import { Test, TestingModule } from '@nestjs/testing';

const mockPrismaModule = {
  PrismaService: jest.fn(),
};
jest.mock('src/prisma/prisma.service', () => mockPrismaModule);

import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed-password',
  refreshToken: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
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
      const input = { email: 'new@example.com', password: 'hashed' };
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-2',
        ...input,
        refreshToken: null,
      });

      const result = await service.create(input);

      expect(result).toEqual({ id: 'user-2', ...input, refreshToken: null });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('updateRefreshToken', () => {
    it('should update the refresh token', async () => {
      const updated = { ...mockUser, refreshToken: 'new-token' };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('user-1', 'new-token');

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: 'new-token' },
      });
    });

    it('should clear the refresh token with null', async () => {
      const updated = { ...mockUser, refreshToken: null };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateRefreshToken('user-1', null);

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });
});
