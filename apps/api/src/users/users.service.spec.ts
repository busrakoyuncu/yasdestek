import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const admin = { id: 'a1', role: 'ADMIN' } as CurrentUser;
const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;

describe('UsersService', () => {
  const tx = {
    user: { updateMany: jest.fn() },
    session: { deleteMany: jest.fn() },
  };
  const prisma = {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'new', ...data }),
    );
  });

  const codeOf = (promise: Promise<unknown>) =>
    promise.catch(
      (error: HttpException) => (error.getResponse() as { code: string }).code,
    );

  describe('create', () => {
    it('admin creates a psychologist with no owner', async () => {
      const { user, password } = await service.create(admin, {
        role: 'PSYCHOLOGIST',
        username: 'dr.ayse',
      });
      expect(user).toMatchObject({
        role: 'PSYCHOLOGIST',
        psychologistId: null,
      });
      const [{ data }] = prisma.user.create.mock.calls[0] as [
        { data: { passwordHash: string } },
      ];
      await expect(argon2.verify(data.passwordHash, password)).resolves.toBe(
        true,
      );
    });

    it('admin must name an existing psychologist for a participant', async () => {
      await expect(
        codeOf(service.create(admin, { role: 'USER', username: 'elif' })),
      ).resolves.toBe('PSYCHOLOGIST_REQUIRED');

      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.create(admin, {
          role: 'USER',
          username: 'elif',
          psychologistId: 'p9',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.user.findFirst.mockResolvedValueOnce({ id: 'p1' });
      const { user } = await service.create(admin, {
        role: 'USER',
        username: 'elif',
        psychologistId: 'p1',
      });
      expect(user).toMatchObject({ psychologistId: 'p1' });
    });

    it('psychologist creates only own participants', async () => {
      const { user } = await service.create(psychologist, {
        role: 'USER',
        username: 'elif',
        psychologistId: 'someone-else',
      });
      expect(user).toMatchObject({ psychologistId: 'p1' });

      await expect(
        service.create(psychologist, { role: 'PSYCHOLOGIST', username: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('answers 409 for a taken username', async () => {
      prisma.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.create(admin, { role: 'PSYCHOLOGIST', username: 'dr.ayse' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('lists only what the caller manages', async () => {
    await service.list(psychologist);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'USER', psychologistId: 'p1' },
      }),
    );
    await service.list(admin);
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { role: { not: 'ADMIN' } } }),
    );
  });

  it('deactivates and ends sessions together, 404 outside the scope', async () => {
    tx.user.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.deactivate(psychologist, 'u1');
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', role: 'USER', psychologistId: 'p1' },
      data: { active: false },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });

    tx.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.deactivate(psychologist, 'u2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('activates within the scope, 404 outside it', async () => {
    prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.activate(admin, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resets the password, forces a change, and ends sessions', async () => {
    tx.user.updateMany.mockResolvedValueOnce({ count: 1 });
    const password = await service.resetPassword(admin, 'p1');
    const [{ data }] = tx.user.updateMany.mock.calls[0] as [
      { data: { passwordHash: string; mustChangePassword: boolean } },
    ];
    expect(data.mustChangePassword).toBe(true);
    await expect(argon2.verify(data.passwordHash, password)).resolves.toBe(
      true,
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'p1' },
    });
  });

  it('rejects bad input before touching the database', async () => {
    await expect(
      service.create(admin, { role: 'USER', username: 'elif' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
