import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from './session.service';
import { JwtUser } from './types';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashedpassword',
  emailVerified: false,
  verificationToken: 'verification-token',
  resetToken: null,
};

const mockUserService = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdWithPreferences: jest.fn(),
  create: jest.fn(),
  updateVerificationToken: jest.fn(),
  validateEmail: jest.fn(),
  setPasswordResetToken: jest.fn(),
  changePassword: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

const mockPrismaService = {
  // eslint-disable-next-line
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

const mockSessionService = {
  createSession: jest.fn(),
  findById: jest.fn(),
  touchSession: jest.fn(),
  deleteSession: jest.fn(),
  deleteAllSessions: jest.fn(),
  deleteOtherSessions: jest.fn(),
  listUserSessions: jest.fn(),
  deleteSessionForUser: jest.fn(),
  deleteExpiredSessions: jest.fn(),
  parseDeviceName: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        // eslint-disable-next-line
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        emailVerified: mockUser.emailVerified,
      });
      expect(mockUserService.findOne).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when user is not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      const result = await service.validateUser('bad@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and create session', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('access-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockSessionService.createSession.mockResolvedValue({ id: 'session-1' });

      const result = await service.login(
        mockUser as JwtUser,
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          hashedRefreshToken: 'hashed-refresh',
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
        }),
      );
    });
  });

  describe('signup', () => {
    it('should create user and return tokens', async () => {
      mockUserService.findOne.mockResolvedValue(null);
      mockJwtService.signAsync
        .mockResolvedValueOnce('verification-token')
        .mockResolvedValueOnce('refresh-token')
        .mockResolvedValueOnce('access-token');
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hashed-verification')
        .mockResolvedValueOnce('hashedpw')
        .mockResolvedValueOnce('hashed-refresh');
      mockUserService.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        emailVerified: false,
      });
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);
      mockSessionService.createSession.mockResolvedValue({ id: 'session-1' });

      const result = await service.signup({
        email: 'new@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(mockUserService.create).toHaveBeenCalledWith(
        {
          email: 'new@example.com',
          password: 'hashedpw',
          verificationToken: 'hashed-verification',
        },
        mockPrismaService,
      );
      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user',
          hashedRefreshToken: 'hashed-refresh',
        }),
        mockPrismaService,
      );
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        'verification-token',
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);

      await expect(
        service.signup({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshTokens', () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 86400000),
    };

    it('should return new access token when refresh token is valid', async () => {
      mockSessionService.findById.mockResolvedValue(mockSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSessionService.touchSession.mockResolvedValue(undefined);
      mockUserService.findById.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce('new-access');

      const result = await service.refreshTokens(
        'user-1',
        'valid-refresh',
        'session-1',
      );

      expect(result).toEqual({ access_token: 'new-access' });
      expect(mockSessionService.touchSession).toHaveBeenCalledWith('session-1');
    });

    it('should throw ForbiddenException when session not found', async () => {
      mockSessionService.findById.mockResolvedValue(null);

      await expect(
        service.refreshTokens('user-1', 'token', 'bad-session'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session userId does not match', async () => {
      mockSessionService.findById.mockResolvedValue({
        ...mockSession,
        userId: 'other-user',
      });

      await expect(
        service.refreshTokens('user-1', 'token', 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session is expired', async () => {
      mockSessionService.findById.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refreshTokens('user-1', 'token', 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when refresh token does not match', async () => {
      mockSessionService.findById.mockResolvedValue(mockSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-1', 'wrong-token', 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should delete the session', async () => {
      mockSessionService.deleteSession.mockResolvedValue(undefined);

      await service.logout('session-1');

      expect(mockSessionService.deleteSession).toHaveBeenCalledWith(
        'session-1',
      );
    });
  });

  describe('validateEmail', () => {
    it('should validate email with valid token', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUserService.validateEmail.mockResolvedValue(undefined);

      await service.validateEmail('valid-token');

      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Object),
      );
      expect(mockUserService.validateEmail).toHaveBeenCalledWith(
        'test@example.com',
        'valid-token',
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.validateEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.validateEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.validateEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should generate new token and send verification email', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new-verification-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue(
        'hashed-new-verification-token',
      );
      mockUserService.updateVerificationToken.mockResolvedValue(undefined);
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerificationEmail('user-1');

      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { email: mockUser.email },
        expect.objectContaining({ expiresIn: '1d' }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('new-verification-token', 10);
      expect(mockUserService.updateVerificationToken).toHaveBeenCalledWith(
        'user-1',
        'hashed-new-verification-token',
      );
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        'new-verification-token',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.resendVerificationEmail('bad-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if email already verified', async () => {
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      await expect(service.resendVerificationEmail('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token, hash it, and send email for existing user', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('reset-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-reset-token');
      mockUserService.setPasswordResetToken.mockResolvedValue(undefined);
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset('test@example.com');

      expect(mockUserService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({ expiresIn: '1h' }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('reset-token', 10);
      expect(mockUserService.setPasswordResetToken).toHaveBeenCalledWith(
        'test@example.com',
        'hashed-reset-token',
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
      );
    });

    it('should silently return for non-existent user', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      await service.requestPasswordReset('nonexistent@example.com');

      expect(mockUserService.findOne).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(mockUserService.setPasswordResetToken).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const userWithResetToken = {
      ...mockUser,
      resetToken: 'valid-reset-token',
    };

    it('should change password with valid token and delete all sessions', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUserService.findOne.mockResolvedValue(userWithResetToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUserService.changePassword.mockResolvedValue(undefined);
      mockSessionService.deleteAllSessions.mockResolvedValue(undefined);

      await service.changePassword({
        token: 'valid-reset-token',
        password: 'newpassword123!',
      });

      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-reset-token',
        expect.any(Object),
      );
      expect(mockUserService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'valid-reset-token',
        userWithResetToken.resetToken,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123!', 10);
      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        'test@example.com',
        'new-hashed-password',
        mockPrismaService,
      );
      expect(mockSessionService.deleteAllSessions).toHaveBeenCalledWith(
        'user-1',
        mockPrismaService,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.changePassword({
          token: 'invalid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.changePassword({
          token: 'expired-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUserService.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reset token does not match', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        resetToken: 'hashed-different-token',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user has no reset token', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        resetToken: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password and delete other sessions', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUserService.updatePassword.mockResolvedValue(undefined);
      mockSessionService.deleteOtherSessions.mockResolvedValue(undefined);

      await service.updatePassword(
        'user-1',
        'currentpass',
        'newpass123!',
        'session-1',
      );

      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'currentpass',
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123!', 10);
      expect(mockUserService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'new-hashed-password',
        mockPrismaService,
      );
      expect(mockSessionService.deleteOtherSessions).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        mockPrismaService,
      );
    });

    it('should throw BadRequestException when current password is wrong', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updatePassword('user-1', 'wrongpass', 'newpass123!'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        service.updatePassword('bad-id', 'currentpass', 'newpass123!'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile with preferences', async () => {
      const userWithPrefs = {
        ...mockUser,
        createdAt: new Date('2025-01-01'),
        preferences: {
          userId: 'user-1',
          language: 'en-US',
          timezone: 'America/New_York',
        },
      };
      mockUserService.findByIdWithPreferences.mockResolvedValue(userWithPrefs);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
        createdAt: new Date('2025-01-01'),
        preferences: { language: 'en-US', timezone: 'America/New_York' },
      });
      expect(mockUserService.findByIdWithPreferences).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should return user profile with null preferences', async () => {
      const userWithoutPrefs = {
        ...mockUser,
        createdAt: new Date('2025-01-01'),
        preferences: null,
      };
      mockUserService.findByIdWithPreferences.mockResolvedValue(
        userWithoutPrefs,
      );

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
        createdAt: new Date('2025-01-01'),
        preferences: null,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserService.findByIdWithPreferences.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listSessions', () => {
    it('should return sessions with isCurrent flag', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceName: 'Chrome on Windows',
          ipAddress: '127.0.0.1',
          lastUsedAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(),
        },
        {
          id: 'session-2',
          deviceName: 'Firefox on Linux',
          ipAddress: '192.168.1.1',
          lastUsedAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      ];
      mockSessionService.listUserSessions.mockResolvedValue(sessions);

      const result = await service.listSessions('user-1', 'session-1');

      expect(result).toHaveLength(2);
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      mockSessionService.deleteSessionForUser.mockResolvedValue(1);

      await service.revokeSession('session-1', 'user-1');

      expect(mockSessionService.deleteSessionForUser).toHaveBeenCalledWith(
        'session-1',
        'user-1',
      );
    });

    it('should throw NotFoundException if session not found', async () => {
      mockSessionService.deleteSessionForUser.mockResolvedValue(0);

      await expect(
        service.revokeSession('bad-session', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeAllSessions', () => {
    it('should delete all sessions for user', async () => {
      mockSessionService.deleteAllSessions.mockResolvedValue({ count: 3 });

      await service.revokeAllSessions('user-1');

      expect(mockSessionService.deleteAllSessions).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });
});
