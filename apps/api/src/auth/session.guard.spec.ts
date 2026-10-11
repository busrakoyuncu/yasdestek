import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOW_PASSWORD_CHANGE_PENDING_KEY,
  IS_PUBLIC_KEY,
} from './auth.decorators';
import { SessionGuard } from './session.guard';

const user = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
};
const inAnHour = new Date(Date.now() + 60 * 60 * 1000);
const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);

function contextWith(cookies: Record<string, string>, flags: string[] = []) {
  const request: { cookies: Record<string, string>; user?: unknown } = {
    cookies,
  };
  const reflector = {
    getAllAndOverride: (key: string) => flags.includes(key) || undefined,
  } as unknown as Reflector;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, reflector, context };
}

describe('SessionGuard', () => {
  const findUnique = jest.fn();
  const prisma = { session: { findUnique } } as unknown as PrismaService;

  it('skips public routes without touching the database', async () => {
    const { reflector, context } = contextWith({}, [IS_PUBLIC_KEY]);
    await expect(
      new SessionGuard(reflector, prisma).canActivate(context),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without a session cookie', async () => {
    const { reflector, context } = contextWith({});
    await expect(
      new SessionGuard(reflector, prisma).canActivate(context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown, expired, and inactive sessions', async () => {
    const { reflector, context } = contextWith({ sid: 's1' });
    const guard = new SessionGuard(reflector, prisma);

    findUnique.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    findUnique.mockResolvedValueOnce({ expiresAt: anHourAgo, user });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    findUnique.mockResolvedValueOnce({
      expiresAt: inAnHour,
      user: { ...user, active: false },
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user for a valid session', async () => {
    const { request, reflector, context } = contextWith({ sid: 's1' });
    findUnique.mockResolvedValueOnce({ expiresAt: inAnHour, user });
    await expect(
      new SessionGuard(reflector, prisma).canActivate(context),
    ).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });

  it('blocks users who must change their password, except on allowed routes', async () => {
    const pending = { ...user, mustChangePassword: true };

    const blocked = contextWith({ sid: 's1' });
    findUnique.mockResolvedValueOnce({ expiresAt: inAnHour, user: pending });
    await expect(
      new SessionGuard(blocked.reflector, prisma).canActivate(blocked.context),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const allowed = contextWith({ sid: 's1' }, [
      ALLOW_PASSWORD_CHANGE_PENDING_KEY,
    ]);
    findUnique.mockResolvedValueOnce({ expiresAt: inAnHour, user: pending });
    await expect(
      new SessionGuard(allowed.reflector, prisma).canActivate(allowed.context),
    ).resolves.toBe(true);
  });
});
