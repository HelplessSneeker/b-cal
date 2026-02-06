import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
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
  refreshToken: 'hashedRefreshToken',
  emailVerified: false,
  verificationToken: 'verification-token',
  resetToken: null,
};

const mockUsersService = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
  updateVerificationToken: jest.fn(),
  validateEmail: jest.fn(),
  setPasswordResetToken: jest.fn(),
  changePassword: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockMailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
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
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        emailVerified: mockUser.emailVerified,
      });
      expect(mockUsersService.findOne).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when user is not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.validateUser('bad@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and store hashed refresh token', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(mockUser as JwtUser);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'hashed-refresh',
      );
    });
  });

  describe('signup', () => {
    it('should create user and return tokens', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      mockJwtService.signAsync
        .mockResolvedValueOnce('verification-token')
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hashedpw')
        .mockResolvedValueOnce('hashed-refresh');
      mockUsersService.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        emailVerified: false,
      });
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.signup({
        email: 'new@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashedpw',
        verificationToken: 'verification-token',
      });
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        'verification-token',
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      await expect(
        service.signup({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens when refresh token is valid', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens('user-1', 'valid-refresh');

      expect(result).toEqual({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      });
    });

    it('should throw ForbiddenException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('bad-id', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has no refresh token', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refreshTokens('user-1', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when refresh token does not match', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-1', 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should clear the refresh token', async () => {
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-1');

      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });

  describe('validateEmail', () => {
    it('should validate email with valid token', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUsersService.validateEmail.mockResolvedValue(undefined);

      await service.validateEmail('valid-token');

      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Object),
      );
      expect(mockUsersService.validateEmail).toHaveBeenCalledWith(
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
      expect(mockUsersService.validateEmail).not.toHaveBeenCalled();
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
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new-verification-token');
      mockUsersService.updateVerificationToken.mockResolvedValue(undefined);
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerificationEmail('user-1');

      expect(mockUsersService.findById).toHaveBeenCalledWith('user-1');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { email: mockUser.email },
        expect.objectContaining({ expiresIn: '1d' }),
      );
      expect(mockUsersService.updateVerificationToken).toHaveBeenCalledWith(
        'user-1',
        'new-verification-token',
      );
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        'new-verification-token',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.resendVerificationEmail('bad-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if email already verified', async () => {
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      await expect(service.resendVerificationEmail('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and send email for existing user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('reset-token');
      mockUsersService.setPasswordResetToken.mockResolvedValue(undefined);
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.requestPasswordReset('test@example.com');

      expect(mockUsersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({ expiresIn: '1h' }),
      );
      expect(mockUsersService.setPasswordResetToken).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
      );
    });

    it('should silently return for non-existent user', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await service.requestPasswordReset('nonexistent@example.com');

      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(mockUsersService.setPasswordResetToken).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const userWithResetToken = {
      ...mockUser,
      resetToken: 'valid-reset-token',
    };

    it('should change password with valid token', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUsersService.findOne.mockResolvedValue(userWithResetToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUsersService.changePassword.mockResolvedValue(undefined);

      await service.changePassword({
        token: 'valid-reset-token',
        password: 'newpassword123!',
      });

      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-reset-token',
        expect.any(Object),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123!', 10);
      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        'test@example.com',
        'new-hashed-password',
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
      expect(mockUsersService.changePassword).not.toHaveBeenCalled();
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
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reset token does not match', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        resetToken: 'different-token',
      });

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user has no reset token', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@example.com' });
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        resetToken: null,
      });

      await expect(
        service.changePassword({
          token: 'valid-token',
          password: 'newpassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.changePassword).not.toHaveBeenCalled();
    });
  });
});
