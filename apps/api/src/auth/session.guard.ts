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
    const sessionId = cookies[SESSION_COOKIE];
    if (!sessionId) throw new UnauthorizedException();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { omit: { passwordHash: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      throw new UnauthorizedException();
    }

    request.user = session.user;

    if (
      session.user.mustChangePassword &&
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
