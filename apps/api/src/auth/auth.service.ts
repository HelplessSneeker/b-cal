import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { JwtUser, TokenResponse } from './types';
import { SignupDto } from './dto/signup.dto';
import { jwtConstants, saltRounds } from './constants';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private prisma: PrismaService,
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

  private async generateTokens(user: {
    id: string;
    email: string;
    emailVerified: boolean;
  }): Promise<TokenResponse> {
    const payload = {
      email: user.email,
      sub: user.id,
      emailVerified: user.emailVerified,
    };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: '7d',
        algorithm: 'HS256' as const,
      }),
    ]);
    return { access_token, refresh_token };
  }

  async login(user: JwtUser): Promise<TokenResponse> {
    const tokens = await this.generateTokens(user);
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refresh_token,
      saltRounds,
    );
    await this.userService.updateRefreshToken(user.id, hashedRefreshToken);
    this.logger.log(`User logged in: ${user.id}`);
    return tokens;
  }

  async signup(signupDto: SignupDto): Promise<TokenResponse> {
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

    const { user, tokens } = await this.prisma.$transaction(async (tx) => {
      const user = await this.userService.create(
        {
          email,
          password: hashedPassword,
          verificationToken: hashedVerificationToken,
        },
        tx,
      );
      const tokens = await this.generateTokens(user);
      const hashedRefreshToken = await bcrypt.hash(
        tokens.refresh_token,
        saltRounds,
      );
      await this.userService.updateRefreshToken(
        user.id,
        hashedRefreshToken,
        tx,
      );

      return { user, tokens };
    });

    await this.mailService.sendVerificationEmail(email, verificationToken);

    this.logger.log(`User signed up: ${user.id}`);
    return tokens;
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refresh_token,
      saltRounds,
    );

    // Conditional update: only succeeds if the refresh token hasn't been
    // rotated by a concurrent request since we read it.
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, refreshToken: user.refreshToken },
      data: { refreshToken: hashedRefreshToken },
    });

    if (count === 0) {
      throw new ForbiddenException('Access denied');
    }

    return tokens;
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
      await this.userService.updateRefreshToken(user.id, null, tx);
    });

    this.logger.log(`Password changed: ${user.id}`);
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
    this.logger.log(`User logged out: ${userId}`);
  }
}
