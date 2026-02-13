import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter extends SentryGlobalFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = (request.id as string) ?? request.headers['x-request-id'];

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
