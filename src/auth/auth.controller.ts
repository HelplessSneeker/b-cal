import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guard/jwt-refresh-auth.guard';
import type { RequestWithUser, RequestWithRefreshUser } from './types';
import { SignupDto } from './dto/signup.dto';
import { ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: RequestWithUser) {
    return this.authService.login(req.user);
  }

  @Post('signup')
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  refresh(@Request() req: RequestWithRefreshUser) {
    return this.authService.refreshTokens(req.user.id, req.user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req: RequestWithUser) {
    return this.authService.logout(req.user.id);
  }
}
