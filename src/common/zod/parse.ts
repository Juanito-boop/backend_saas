import type { ZodType } from 'zod';

import { InternalError } from '../errors/application-error';

export function parseSchema<TOutput>(
  schema: ZodType<TOutput>,
  value: unknown,
  context: string,
): TOutput {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new InternalError(`Invalid output in ${context}`, {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  return result.data;
}

export function parseOptionalSchema<TOutput>(
  schema: ZodType<TOutput>,
  value: unknown,
  context: string,
): TOutput | null {
  if (value == null) {
    return null;
  }

  return parseSchema(schema, value, context);
}