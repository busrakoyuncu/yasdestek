import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { User } from '../generated/prisma/client';

// The authenticated user, attached to the request by the session guard.
export type CurrentUser = Omit<User, 'passwordHash'>;

declare global {
  // Express types are extended through its global namespace; no module form exists.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

// Controller parameter: the authenticated user. Only valid behind the session guard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>().user,
);
