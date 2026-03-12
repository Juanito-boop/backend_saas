import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { ValidationError } from '../errors/application-error';

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) { }

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ValidationError('Request validation failed', {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    return result.data;
  }
}