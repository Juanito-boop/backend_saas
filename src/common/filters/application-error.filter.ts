import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError } from '../errors/application-error';

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const payload: Record<string, unknown> = {
      statusCode: exception.statusCode,
      code: exception.code,
      message: exception.message,
    };

    if (exception.details) {
      payload.details = exception.details;
    }

    response.status(exception.statusCode).json(payload);
  }
}
