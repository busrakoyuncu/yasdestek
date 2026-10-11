import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../generated/prisma/client';
import { ROLES_KEY } from './roles.decorator';

// Second authorization layer: @Roles() metadata. Runs after the session guard,
// which attaches request.user. Wrong role answers 403.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    return user !== undefined && roles.includes(user.role);
  }
}
