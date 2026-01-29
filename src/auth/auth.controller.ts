import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guard/jwt-refresh-auth.guard';
import type { RequestWithUser, RequestWithRefreshUser } from './types';
import { SignupDto } from './dto/signup.dto';
import { ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { cookieConfig } from './constants';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setTokenCookies(
    res: express.Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(cookieConfig.accessToken.name, accessToken, {
      ...cookieConfig.options,
      maxAge: cookieConfig.accessToken.maxAge,
    });
    res.cookie(cookieConfig.refreshToken.name, refreshToken, {
      ...cookieConfig.options,
      maxAge: cookieConfig.refreshToken.maxAge,
    });
  }

  private clearTokenCookies(res: express.Response) {
    res.clearCookie(cookieConfig.accessToken.name, cookieConfig.options);
    res.clearCookie(cookieConfig.refreshToken.name, cookieConfig.options);
  }

  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.login(req.user);
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Login successful' };
  }

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
    @Request() req: RequestWithRefreshUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      req.user.id,
      req.user.refreshToken,
    );
    this.setTokenCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Tokens refreshed' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.logout(req.user.id);
    this.clearTokenCookies(res);
    return { message: 'Logout successful' };
  }
}
