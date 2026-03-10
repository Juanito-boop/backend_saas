import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { auth } from './auth';
import { IS_PUBLIC_KEY } from './public';

export type AuthenticatedUser = {
  id: string;
  email: string;
  emailVerified: boolean;
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
  constructor(private readonly reflector: Reflector) { }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
      emailVerified: session.user.emailVerified,
    };

    return true;
  }
}

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();

    if (!request.authUser) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!request.authUser.emailVerified) {
      throw new ForbiddenException('Email verification is required');
    }

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