import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client';
import { RolesGuard } from './roles.guard';

function contextWith(user?: { role: Role }) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  it('allows routes without @Roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'PSYCHOLOGIST']);
    expect(guard.canActivate(contextWith({ role: 'PSYCHOLOGIST' }))).toBe(true);
  });

  it('rejects a user whose role is not listed', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(contextWith({ role: 'USER' }))).toBe(false);
  });

  it('rejects when no user is attached', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(contextWith(undefined))).toBe(false);
  });
});
