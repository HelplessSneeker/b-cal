import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { jwtConstants, cookieConfig } from '../constants';
import { JwtPayload } from '../types';
import { SessionService } from '../session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private sessionService: SessionService) {
    super({
      jwtFromRequest: (req: Request): string | null =>
        (req?.cookies?.[cookieConfig.accessToken.name] as string) ?? null,
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      algorithms: ['HS256'] as const,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.sid) {
      const session = await this.sessionService.findById(payload.sid);
      if (!session) {
        throw new UnauthorizedException();
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified,
      sessionId: payload.sid,
    };
  }
}
