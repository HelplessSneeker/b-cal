import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import {
  generateCsrfToken,
  csrfCookieName,
  csrfCookieOptions,
} from '../csrf/csrf.config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guard/jwt-refresh-auth.guard';
import type { JwtUser, JwtRefreshUser } from './types';
import { SignupDto } from './dto/signup.dto';
import { ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { cookieConfig } from './constants';
import { User } from './decorators/user.decorator';
import { RequestPasswordResetDTO } from './dto/request-password-reset.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setTokenCookies(
    res: express.Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(cookieConfig.accessToken.name, accessToken, {
      ...cookieConfig.accessToken.options,
      maxAge: cookieConfig.accessToken.maxAge,
    });
    res.cookie(cookieConfig.refreshToken.name, refreshToken, {
      ...cookieConfig.refreshToken.options,
      maxAge: cookieConfig.refreshToken.maxAge,
    });
  }

  private clearTokenCookies(res: express.Response) {
    res.clearCookie(
      cookieConfig.accessToken.name,
      cookieConfig.accessToken.options,
    );
    res.clearCookie(
      cookieConfig.refreshToken.name,
      cookieConfig.refreshToken.options,
    );
    res.clearCookie(csrfCookieName, csrfCookieOptions);
  }

  @Get('csrf-token')
  csrfToken(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = generateCsrfToken(req, res);
    return { data: { csrfToken: token } };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @User() user: JwtUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.login(user);
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Login successful' };
  }

  @Throttle({
    default: { ttl: 60000, limit: 5 },
    mail: { ttl: 300000, limit: 3 },
  })
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.signup(signupDto);
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Signup successful' };
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(
    @User() user: JwtRefreshUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @User('id') userId: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.logout(userId);
    this.clearTokenCookies(res);
    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User() user: JwtUser) {
    const dbUser = await this.authService.getProfile(user.id);
    return { data: dbUser };
  }

  @Throttle({
    default: { ttl: 60000, limit: 5 },
    mail: { ttl: 300000, limit: 3 },
  })
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  async resendVerification(@User('id') userId: string) {
    await this.authService.resendVerificationEmail(userId);
    return { message: 'Verification email sent' };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Get('verify-email')
  async verifyEmail(@Query() query: VerifyEmailDto) {
    await this.authService.validateEmail(query.token);

    return { message: 'Email verified' };
  }

  @Throttle({
    default: { ttl: 60000, limit: 5 },
    mail: { ttl: 300000, limit: 3 },
  })
  @ApiBody({ type: RequestPasswordResetDTO })
  @Post('forgot-password')
  async forgotPassword(
    @Body() requestPasswordResetDTO: RequestPasswordResetDTO,
  ) {
    await this.authService.requestPasswordReset(requestPasswordResetDTO.email);

    return { message: 'If that email exists, we sent a reset link' };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiBody({ type: ChangePasswordDTO })
  @Post('reset-password')
  async resetPassword(@Body() changePasswordDTO: ChangePasswordDTO) {
    await this.authService.changePassword(changePasswordDTO);
    return { message: 'Password changed successfully' };
  }
}
