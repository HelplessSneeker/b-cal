import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { JwtUser, TokenResponse, AccessTokenResponse } from './types';
import { SignupDto } from './dto/signup.dto';
import { jwtConstants, saltRounds } from './constants';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {}

  async validateUser(email: string, pass: string): Promise<JwtUser | null> {
    const user = await this.userService.findOne(email);
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      };
    }
    return null;
  }

  private generateAccessToken(
    user: { id: string; email: string; emailVerified: boolean },
    sessionId: string,
  ): Promise<string> {
    const payload = {
      email: user.email,
      sub: user.id,
      emailVerified: user.emailVerified,
      sid: sessionId,
    };
    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken(
    user: { id: string; email: string; emailVerified: boolean },
    sessionId: string,
  ): Promise<string> {
    const payload = {
      email: user.email,
      sub: user.id,
      emailVerified: user.emailVerified,
      sid: sessionId,
    };
    return this.jwtService.signAsync(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: '30d',
      algorithm: 'HS256' as const,
    });
  }

  async login(
    user: JwtUser,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    const sessionId = crypto.randomUUID();
    const refresh_token = await this.generateRefreshToken(user, sessionId);
    const access_token = await this.generateAccessToken(user, sessionId);
    const hashedRefreshToken = await bcrypt.hash(refresh_token, saltRounds);

    await this.sessionService.createSession({
      id: sessionId,
      userId: user.id,
      hashedRefreshToken,
      userAgent,
      ipAddress,
    });

    this.logger.log(`User logged in: ${user.id}`);
    return { access_token, refresh_token };
  }

  async signup(
    signupDto: SignupDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    const { email, password } = signupDto;

    const existingUser = await this.userService.findOne(email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const verificationToken = await this.jwtService.signAsync(
      { email },
      {
        secret: jwtConstants.mailSecret,
        expiresIn: '1d',
        algorithm: 'HS256' as const,
      },
    );

    const hashedVerificationToken = await bcrypt.hash(
      verificationToken,
      saltRounds,
    );
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sessionId = crypto.randomUUID();

    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      const user = await this.userService.create(
        {
          email,
          password: hashedPassword,
          verificationToken: hashedVerificationToken,
        },
        tx,
      );

      const refresh_token = await this.generateRefreshToken(user, sessionId);
      const access_token = await this.generateAccessToken(user, sessionId);
      const hashedRefreshToken = await bcrypt.hash(refresh_token, saltRounds);

      await this.sessionService.createSession(
        {
          id: sessionId,
          userId: user.id,
          hashedRefreshToken,
          userAgent,
          ipAddress,
        },
        tx,
      );

      return { user, tokens: { access_token, refresh_token } };
    });

    await this.mailService.sendVerificationEmail(email, verificationToken);

    this.logger.log(`User signed up: ${user.id}`);
    return tokens;
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    sessionId: string,
  ): Promise<AccessTokenResponse> {
    const session = await this.sessionService.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.expiresAt < new Date()) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!isMatch) {
      throw new ForbiddenException('Access denied');
    }

    await this.sessionService.touchSession(sessionId);

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const access_token = await this.generateAccessToken(user, sessionId);
    return { access_token };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = await this.jwtService.signAsync(
      { email: user.email },
      {
        secret: jwtConstants.mailSecret,
        expiresIn: '1d',
        algorithm: 'HS256' as const,
      },
    );

    const hashedVerificationToken = await bcrypt.hash(
      verificationToken,
      saltRounds,
    );

    await this.userService.updateVerificationToken(
      user.id,
      hashedVerificationToken,
    );
    await this.mailService.sendVerificationEmail(user.email, verificationToken);
    this.logger.log(`Verification email resent: ${user.id}`);
  }

  async validateEmail(token: string) {
    let payload: { email: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: jwtConstants.mailSecret,
        algorithms: ['HS256'] as const,
      });
    } catch {
      this.logger.error('Email verification failed: invalid or expired token');
      throw new BadRequestException('Invalid or expired token');
    }

    const userId = await this.userService.validateEmail(payload.email, token);
    this.logger.log(`Email verified: ${userId}`);
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findOne(email);

    if (!user) {
      return;
    }

    const resetToken = await this.jwtService.signAsync(
      { email },
      {
        secret: jwtConstants.mailSecret,
        expiresIn: '1h',
        algorithm: 'HS256' as const,
      },
    );

    const hashedResetToken = await bcrypt.hash(resetToken, saltRounds);

    await this.userService.setPasswordResetToken(email, hashedResetToken);
    await this.mailService.sendPasswordResetEmail(email, resetToken);
    this.logger.log(`Password reset requested: ${user.id}`);
  }

  async changePassword(changePasswordDTO: ChangePasswordDTO) {
    let payload: { email: string };
    try {
      payload = this.jwtService.verify(changePasswordDTO.token, {
        secret: jwtConstants.mailSecret,
        algorithms: ['HS256'] as const,
      });
    } catch {
      this.logger.error('Password change failed: invalid or expired token');
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.userService.findOne(payload.email);
    const isMatch = user?.resetToken
      ? await bcrypt.compare(changePasswordDTO.token, user.resetToken)
      : false;

    if (!user || !isMatch) {
      this.logger.error(
        `Password change failed: token mismatch for user ${user?.id ?? 'unknown'}`,
      );
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(
        changePasswordDTO.password,
        saltRounds,
      );

      await this.userService.changePassword(payload.email, hashedPassword, tx);
      await this.sessionService.deleteAllSessions(user.id, tx);
    });

    this.logger.log(`Password changed: ${user.id}`);
  }

  async getProfile(userId: string) {
    const user = await this.userService.findByIdWithPreferences(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      preferences: user.preferences
        ? {
            language: user.preferences.language,
            timezone: user.preferences.timezone,
          }
        : null,
    };
  }

  async logout(sessionId: string) {
    await this.sessionService.deleteSession(sessionId);
    this.logger.log(`Session logged out: ${sessionId}`);
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.sessionService.listUserSessions(userId);
    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));
  }

  async revokeSession(sessionId: string, userId: string) {
    const count = await this.sessionService.deleteSessionForUser(
      sessionId,
      userId,
    );
    if (count === 0) {
      throw new NotFoundException('Session not found');
    }
  }

  async revokeAllSessions(userId: string) {
    await this.sessionService.deleteAllSessions(userId);
  }
}
