import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockAuthService = {
  login: jest.fn(),
  signup: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed',
};

const mockTokens = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens from authService.login', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);

      const result = await controller.login({ user: mockUser } as any);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('signup', () => {
    it('should return tokens from authService.signup', async () => {
      mockAuthService.signup.mockResolvedValue(mockTokens);
      const dto = { email: 'new@example.com', password: 'password' };

      const result = await controller.signup(dto);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.signup).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with user id and token', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);
      const req = {
        user: { id: 'user-1', email: 'test@example.com', refreshToken: 'rt' },
      };

      const result = await controller.refresh(req as any);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user-1',
        'rt',
      );
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout({ user: mockUser } as any);

      expect(result).toBeUndefined();
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1');
    });
  });
});
