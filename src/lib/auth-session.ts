import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { auth } from './auth';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

type RequestWithAuthUser = Request & {
  authUser?: AuthenticatedUser;
};

function toHeaders(request: Request) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
      continue;
    }

    if (typeof value === 'string') {
      headers.set(key, value);
    }
  }

  return headers;
}

@Injectable()
export class AuthSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const session = await auth.api.getSession({
      headers: toHeaders(request),
    });

    if (!session?.user) {
      throw new UnauthorizedException('Authentication is required');
    }

    request.authUser = {
      id: session.user.id,
      email: session.user.email,
    };

    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();

    if (!request.authUser) {
      throw new UnauthorizedException('Authentication is required');
    }

    return request.authUser;
  },
);