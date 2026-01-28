import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma/browser';
import { UsersService } from 'src/users/users.service';
import { AuthenticatedUser, TokenResponse } from './types';
import { SignupDto } from './dto/signup.dto';
import { jwtRefreshConstants, saltRounds } from './constants';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      return user;
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
        secret: jwtRefreshConstants.secret,
        expiresIn: '7d',
      }),
    ]);
    return { access_token, refresh_token };
  }

  async login(user: User): Promise<TokenResponse> {
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

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
    });

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

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }
}
