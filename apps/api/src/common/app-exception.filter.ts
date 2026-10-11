import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Every error leaves the api as { code, message }. The frontend maps code to a
// translated message, so codes are stable strings and messages are for humans.
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, code, message } = this.describe(exception);
    if (status >= 500) this.logger.error(exception);
    response.status(status).json({ code, message });
  }

  private describe(exception: unknown) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const custom =
        typeof body === 'object' ? (body as { code?: string }).code : undefined;
      return {
        status,
        code: custom ?? HttpStatus[status],
        message: exception.message,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
  }
}
