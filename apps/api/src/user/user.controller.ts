import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { EmailVerifiedGuard } from 'src/auth/guard/email-verified.guard';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { cookieConfig } from 'src/auth/constants';
import { csrfCookieName, csrfCookieOptions } from 'src/csrf/csrf.config';
import { UserService } from './user.service';
import { User } from 'src/auth/decorators/user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

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

    res.clearCookie(
      cookieConfig.accessToken.name,
      cookieConfig.accessToken.options,
    );
    res.clearCookie(
      cookieConfig.refreshToken.name,
      cookieConfig.refreshToken.options,
    );
    res.clearCookie(csrfCookieName, csrfCookieOptions);

    return { message: 'Successfully deleted user' };
  }

  @Get('preferences')
  async getPreferences(@User('id') userId: string) {
    const preferences = await this.userService.findPreferences(userId);
    return { data: preferences };
  }

  @Patch('preferences')
  async updatePreferences(
    @User('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const existing = await this.userService.findPreferences(userId);

    if (!existing) {
      if (!dto.language || !dto.timezone) {
        throw new BadRequestException(
          'Both language and timezone are required when creating preferences',
        );
      }
    }

    const data = {
      language: dto.language ?? existing!.language,
      timezone: dto.timezone ?? existing!.timezone,
    };

    const preferences = await this.userService.upsertPreferences(userId, data);
    return { message: 'Preferences updated', data: preferences };
  }
}
