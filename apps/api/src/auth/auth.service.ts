import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { JwtUser, TokenResponse } from './types';
import { SignupDto } from './dto/signup.dto';
import { jwtConstants, saltRounds } from './constants';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { ChangePasswordDTO } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<JwtUser | null> {
    const user = await this.usersService.findOne(email);
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
  }): Promise<TokenResponse> {
    const payload = { email: user.email, sub: user.id };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: '7d',
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
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);
    return tokens;
  }

  async signup(signupDto: SignupDto): Promise<TokenResponse> {
    const { email, password } = signupDto;

    const existingUser = await this.usersService.findOne(email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const verificationToken = await this.jwtService.signAsync(
      { email },
      {
        secret: jwtConstants.mailSecret,
        expiresIn: '1d',
      },
    );

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      verificationToken,
    });

    await this.mailService.sendVerificationEmail(email, verificationToken);

    const tokens = await this.generateTokens(user);
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refresh_token,
      saltRounds,
    );
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);
    return tokens;
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    const user = await this.usersService.findById(userId);
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
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);
    return tokens;
  }

  async validateEmail(token: string) {
    let payload: { email: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: jwtConstants.mailSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.usersService.validateEmail(payload.email, token);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findOne(email);

    if (!user) {
      return;
    }

    const resetToken = await this.jwtService.signAsync(
      { email },
      {
        secret: jwtConstants.mailSecret,
        expiresIn: '1h',
      },
    );

    await this.usersService.setPasswordResetToken(email, resetToken);
    await this.mailService.sendPasswordResetEmail(email, resetToken);
  }

  async changePassword(changePasswordDTO: ChangePasswordDTO) {
    let payload: { email: string };
    try {
      payload = this.jwtService.verify(changePasswordDTO.token, {
        secret: jwtConstants.mailSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.usersService.findOne(payload.email);
    if (!user || user.resetToken !== changePasswordDTO.token) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(
      changePasswordDTO.password,
      saltRounds,
    );

    await this.usersService.changePassword(payload.email, hashedPassword);
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }
}
