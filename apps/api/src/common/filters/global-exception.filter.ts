import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter extends SentryGlobalFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response
        .status(status)
        .json(
          typeof exceptionResponse === 'object'
            ? exceptionResponse
            : { statusCode: status, message: exceptionResponse },
        );
      return;
    }

    // Unexpected exception — let Sentry capture it, then return 500
    this.logger.error(
      exception instanceof Error ? exception.message : 'Unknown error',
      exception instanceof Error ? exception.stack : undefined,
    );

    super.catch(exception, host);
  }
}
