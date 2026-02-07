import { Controller, Delete, UseGuards } from '@nestjs/common';
import { EmailVerifiedGuard } from 'src/auth/guard/email-verified.guard';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UserService } from './user.service';
import { User } from 'src/auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Delete()
  async delete(@User('id') userId: string) {
    await this.userService.deleteUser(userId);

    return { message: 'Successfully deleted user' };
  }
}
