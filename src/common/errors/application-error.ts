export type ApplicationErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal_error';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: ApplicationErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'validation_error', details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 401, 'unauthorized', details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, 'forbidden', details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 404, 'not_found', details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'conflict', details);
  }
}

export class InternalError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'internal_error', details);
  }
}