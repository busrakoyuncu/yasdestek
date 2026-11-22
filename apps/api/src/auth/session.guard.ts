import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE } from './auth.constants';
import { findSessionUser } from './session-user';
import {
  ALLOW_PASSWORD_CHANGE_PENDING_KEY,
  IS_PUBLIC_KEY,
} from './auth.decorators';

// First authorization layer: cookie -> session -> active user, else 401.
// Attaches the user to the request for RolesGuard and controllers.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.hasFlag(context, IS_PUBLIC_KEY)) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await findSessionUser(this.prisma, cookies[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException();

    request.user = user;

    if (
      user.mustChangePassword &&
      !this.hasFlag(context, ALLOW_PASSWORD_CHANGE_PENDING_KEY)
    ) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required',
      });
    }
    return true;
  }

  private hasFlag(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}
