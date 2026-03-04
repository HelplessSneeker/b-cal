import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
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
  resendVerificationEmail: jest.fn(),
  getProfile: jest.fn(),
  updatePassword: jest.fn(),
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllSessions: jest.fn(),
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

const mockRequest = (): Partial<Request> => ({
  headers: { 'user-agent': 'Mozilla/5.0 Test' },
  ip: '127.0.0.1',
});

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
      const req = mockRequest();
      const user: JwtUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
      };

      const result = await controller.login(
        user,
        req as Request,
        res as Response,
      );

      expect(result).toEqual({ message: 'Login successful' });
      expect(mockAuthService.login).toHaveBeenCalledWith(
        user,
        'Mozilla/5.0 Test',
        '127.0.0.1',
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('signup', () => {
    it('should set cookies and return success message', async () => {
      mockAuthService.signup.mockResolvedValue(mockTokens);
      const dto = { email: 'new@example.com', password: 'password' };
      const res = mockResponse();
      const req = mockRequest();

      const result = await controller.signup(
        dto,
        req as Request,
        res as Response,
      );

      expect(result).toEqual({ message: 'Signup successful' });
      expect(mockAuthService.signup).toHaveBeenCalledWith(
        dto,
        'Mozilla/5.0 Test',
        '127.0.0.1',
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should set access token cookie and return success message', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({
        access_token: 'new-access',
      });
      const user: JwtRefreshUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        refreshToken: 'rt',
        sessionId: 'session-1',
      };
      const res = mockResponse();

      const result = await controller.refresh(user, res as Response);

      expect(result).toEqual({ message: 'Tokens refreshed' });
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user-1',
        'rt',
        'session-1',
      );
      // Only access token cookie should be set (no refresh token rotation)
      expect(res.cookie).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const res = mockResponse();
      const user: JwtUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        sessionId: 'session-1',
      };

      const result = await controller.logout(user, res as Response);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('session-1');
      expect(res.clearCookie).toHaveBeenCalledTimes(3);
    });
  });

  describe('me', () => {
    it('should return user profile with preferences from database', async () => {
      const user: JwtUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
      };
      const profileData = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date('2025-01-01'),
        preferences: { language: 'en-US', timezone: 'America/New_York' },
      };
      mockAuthService.getProfile.mockResolvedValue(profileData);

      const result = await controller.me(user);

      expect(result).toEqual({ data: profileData });
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updatePassword', () => {
    it('should call authService.updatePassword and return success message', async () => {
      mockAuthService.updatePassword.mockResolvedValue(undefined);
      const user: JwtUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        sessionId: 'session-1',
      };

      const result = await controller.updatePassword(
        { currentPassword: 'oldpass', newPassword: 'newpass123!' },
        user,
      );

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'oldpass',
        'newpass123!',
        'session-1',
      );
    });
  });

  describe('resendVerification', () => {
    it('should call resendVerificationEmail and return success message', async () => {
      mockAuthService.resendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.resendVerification('user-1');

      expect(result).toEqual({ message: 'Verification email sent' });
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });
});
