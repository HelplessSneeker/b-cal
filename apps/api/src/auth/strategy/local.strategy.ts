import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtUser } from '../types';
import { t } from 'src/common/utils/i18n';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<JwtUser> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException(t('error.loginFailed'));
    }
    return user;
  }
}
