import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { EmailVerifiedGuard } from './guard/email-verified.guard';
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
import { UpdatePasswordDTO } from './dto/update-password.dto';
import { t } from 'src/common/utils/i18n';

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
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.login(
      user,
      req.headers['user-agent'],
      req.ip,
    );
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: t('success.loginSuccessful') };
  }

  @Throttle({
    default: { ttl: 60000, limit: 5 },
    mail: { ttl: 300000, limit: 3 },
  })
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.signup(
      signupDto,
      req.headers['user-agent'],
      req.ip,
    );
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: t('success.signupSuccessful') };
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(
    @User() user: JwtRefreshUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { access_token } = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
      user.sessionId,
    );
    res.cookie(cookieConfig.accessToken.name, access_token, {
      ...cookieConfig.accessToken.options,
      maxAge: cookieConfig.accessToken.maxAge,
    });
    return { message: t('success.tokensRefreshed') };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @User() user: JwtUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    if (user.sessionId) {
      await this.authService.logout(user.sessionId);
    }
    this.clearTokenCookies(res);
    return { message: t('success.logoutSuccessful') };
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
    return { message: t('success.verificationEmailSent') };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Get('verify-email')
  async verifyEmail(@Query() query: VerifyEmailDto) {
    await this.authService.validateEmail(query.token);

    return { message: t('success.emailVerified') };
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

    return { message: t('success.passwordResetSent') };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiBody({ type: ChangePasswordDTO })
  @Post('reset-password')
  async resetPassword(@Body() changePasswordDTO: ChangePasswordDTO) {
    await this.authService.changePassword(changePasswordDTO);
    return { message: t('success.passwordChanged') };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post('update-password')
  async updatePassword(@Body() dto: UpdatePasswordDTO, @User() user: JwtUser) {
    await this.authService.updatePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      user.sessionId,
    );
    return { message: t('success.passwordUpdated') };
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Get('sessions')
  async listSessions(@User() user: JwtUser) {
    const sessions = await this.authService.listSessions(
      user.id,
      user.sessionId,
    );
    return { data: sessions };
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete('sessions/:id')
  async revokeSession(@Param('id') sessionId: string, @User() user: JwtUser) {
    if (sessionId === user.sessionId) {
      return { message: t('success.useLogoutForCurrentSession') };
    }
    await this.authService.revokeSession(sessionId, user.id);
    return { message: t('success.sessionRevoked') };
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete('sessions')
  async revokeAllSessions(
    @User() user: JwtUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.revokeAllSessions(user.id);
    this.clearTokenCookies(res);
    return { message: t('success.allSessionsRevoked') };
  }
}
