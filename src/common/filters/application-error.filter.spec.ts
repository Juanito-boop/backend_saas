import type { ArgumentsHost } from '@nestjs/common';

import {
  ConflictError,
  NotFoundError,
} from '../errors/application-error';
import { ApplicationErrorFilter } from './application-error.filter';

describe('ApplicationErrorFilter', () => {
  const createHost = (response: {
    status: jest.Mock;
    json: jest.Mock;
  }): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    }) as ArgumentsHost;

  it('serializes application errors with details', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, json };
    const filter = new ApplicationErrorFilter();

    filter.catch(
      new ConflictError('Membership already exists', {
        teamId: '11111111-1111-1111-1111-111111111111',
      }),
      createHost(response),
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'conflict',
      message: 'Membership already exists',
      details: {
        teamId: '11111111-1111-1111-1111-111111111111',
      },
    });
  });

  it('omits details when the error does not provide them', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, json };
    const filter = new ApplicationErrorFilter();

    filter.catch(new NotFoundError('Product not found'), createHost(response));

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'not_found',
      message: 'Product not found',
    });
  });
});