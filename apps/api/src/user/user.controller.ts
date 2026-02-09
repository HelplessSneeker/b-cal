import { Controller, Delete, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { EmailVerifiedGuard } from 'src/auth/guard/email-verified.guard';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { cookieConfig } from 'src/auth/constants';
import { UserService } from './user.service';
import { User } from 'src/auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Delete()
  async delete(
    @User('id') userId: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.userService.deleteUser(userId);

    res.clearCookie(cookieConfig.accessToken.name, cookieConfig.options);
    res.clearCookie(cookieConfig.refreshToken.name, cookieConfig.options);

    return { message: 'Successfully deleted user' };
  }
}
