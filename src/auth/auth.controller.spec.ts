import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import type { JwtUser, JwtRefreshUser } from './types';

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
  refreshToken: null,
};

const mockTokens = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

type MockResponse = Pick<Response, 'cookie' | 'clearCookie'>;

const mockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.cookie = jest.fn().mockReturnValue(res) as MockResponse['cookie'];
  res.clearCookie = jest
    .fn()
    .mockReturnValue(res) as MockResponse['clearCookie'];
  return res;
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
    it('should set cookies and return success message', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);
      const res = mockResponse();
      const user: JwtUser = { id: mockUser.id, email: mockUser.email };

      const result = await controller.login(user, res as Response);

      expect(result).toEqual({ message: 'Login successful' });
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('signup', () => {
    it('should set cookies and return success message', async () => {
      mockAuthService.signup.mockResolvedValue(mockTokens);
      const dto = { email: 'new@example.com', password: 'password' };
      const res = mockResponse();

      const result = await controller.signup(dto, res as Response);

      expect(result).toEqual({ message: 'Signup successful' });
      expect(mockAuthService.signup).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should set cookies and return success message', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);
      const user: JwtRefreshUser = {
        id: 'user-1',
        email: 'test@example.com',
        refreshToken: 'rt',
      };
      const res = mockResponse();

      const result = await controller.refresh(user, res as Response);

      expect(result).toEqual({ message: 'Tokens refreshed' });
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user-1',
        'rt',
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const res = mockResponse();

      const result = await controller.logout('user-1', res as Response);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('me', () => {
    it('should return user id and email', () => {
      const user: JwtUser = { id: 'user-1', email: 'test@example.com' };

      const result = controller.me(user);

      expect(result).toEqual({ id: 'user-1', email: 'test@example.com' });
    });
  });
});
