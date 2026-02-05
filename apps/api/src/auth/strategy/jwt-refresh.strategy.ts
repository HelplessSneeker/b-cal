import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { jwtRefreshConstants, cookieConfig } from '../constants';
import { JwtPayload } from '../types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: (req: Request): string | null =>
        (req?.cookies?.[cookieConfig.refreshToken.name] as string) ?? null,
      ignoreExpiration: false,
      secretOrKey: jwtRefreshConstants.secret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.[
      cookieConfig.refreshToken.name
    ] as string;
    return { id: payload.sub, email: payload.email, refreshToken };
  }
}
