import { z } from 'zod';

import { ValidationError } from '../errors/application-error';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns parsed data when the payload is valid', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        count: z.coerce.number().int(),
        email: z.string().email(),
      }),
    );

    const result = pipe.transform({
      count: '42',
      email: 'qa@example.com',
    });

    expect(result).toEqual({
      count: 42,
      email: 'qa@example.com',
    });
  });

  it('maps zod issues into a ValidationError payload', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        team: z.object({
          name: z.string().min(3),
        }),
      }),
    );

    expect(() => pipe.transform({ team: { name: '' } })).toThrow(
      ValidationError,
    );

    try {
      pipe.transform({ team: { name: '' } });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: 'Request validation failed',
        statusCode: 400,
        code: 'validation_error',
        details: {
          issues: [
            expect.objectContaining({
              path: 'team.name',
              code: 'too_small',
            }),
          ],
        },
      });
    }
  });
});