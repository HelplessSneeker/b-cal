import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtUser } from '../types';
import { t } from 'src/common/utils/i18n';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: JwtUser }>();
    const user = request.user;

    if (!user?.emailVerified) {
      throw new ForbiddenException(t('error.emailNotVerified'));
    }

    return true;
  }
}
