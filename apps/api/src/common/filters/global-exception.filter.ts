import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { cookieConfig } from '../../auth/constants';
import { csrfCookieName, csrfCookieOptions } from '../../csrf/csrf.config';

@Catch()
export class GlobalExceptionFilter extends SentryGlobalFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = (request.id as string) ?? request.headers['x-request-id'];

    // Clear all auth cookies when token refresh fails to prevent redirect loops
    if (request.path === '/auth/refresh') {
      response.clearCookie(
        cookieConfig.accessToken.name,
        cookieConfig.accessToken.options,
      );
      response.clearCookie(
        cookieConfig.refreshToken.name,
        cookieConfig.refreshToken.options,
      );
      response.clearCookie(csrfCookieName, csrfCookieOptions);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.status(status).json({
        ...(typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { statusCode: status, message: exceptionResponse }),
        requestId,
      });
      return;
    }

    // Unexpected exception — tag Sentry with request ID, then let it capture
    this.logger.error(
      exception instanceof Error ? exception.message : 'Unknown error',
      exception instanceof Error ? exception.stack : undefined,
    );

    Sentry.setTag('requestId', String(requestId));

    super.catch(exception, host);
  }
}
