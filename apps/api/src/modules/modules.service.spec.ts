import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from './modules.service';

const admin = { id: 'a1', role: 'ADMIN' } as CurrentUser;
const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;
const member = { id: 'u1', role: 'USER', groupId: 'g1' } as CurrentUser;
const loner = { id: 'u2', role: 'USER', groupId: null } as CurrentUser;

const input = {
  title: 'Modül 7',
  description: 'd',
  rules: 'r',
  questions: ['q1'],
};

describe('ModulesService', () => {
  const tx = {
    module: { findFirst: jest.fn(), delete: jest.fn() },
    groupModule: { deleteMany: jest.fn() },
  };
  const prisma = {
    module: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    group: { findFirst: jest.fn() },
    groupModule: { createMany: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  };
  const service = new ModulesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('lists by visibility: admin all, psychologist global + own, participant by group', async () => {
    await service.list(admin);
    expect(prisma.module.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );

    await service.list(psychologist);
    const [{ where }] = prisma.module.findMany.mock.calls[1] as [
      { where: { OR: unknown[] } },
    ];
    expect(where.OR).toContainEqual({ createdById: 'p1' });

    await service.list(member);
    expect(prisma.module.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { groups: { some: { groupId: 'g1' } } },
      }),
    );

    await service.list(loner);
    expect(prisma.module.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: { in: [] } } }),
    );
  });

  it('creates at the end of the list unless an order is given', async () => {
    prisma.module.aggregate.mockResolvedValueOnce({ _max: { order: 6 } });
    await service.create(psychologist, input);
    expect(prisma.module.create).toHaveBeenCalledWith({
      data: { ...input, order: 7, createdById: 'p1' },
    });

    await service.create(admin, { ...input, order: 2 });
    expect(prisma.module.aggregate).toHaveBeenCalledTimes(1);
    expect(prisma.module.create).toHaveBeenLastCalledWith({
      data: { ...input, order: 2, createdById: 'a1' },
    });
  });

  it('updates only what the caller may edit', async () => {
    prisma.module.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.update(psychologist, 'm1', { title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.module.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', createdById: 'p1' },
      data: { title: 'x' },
    });
  });

  it('refuses to delete base modules and modules with responses', async () => {
    tx.module.findFirst.mockResolvedValueOnce({
      isBase: true,
      _count: { responses: 0 },
    });
    await expect(service.remove(admin, 'base')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    tx.module.findFirst.mockResolvedValueOnce({
      isBase: false,
      _count: { responses: 3 },
    });
    await expect(service.remove(admin, 'used')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.module.delete).not.toHaveBeenCalled();

    tx.module.findFirst.mockResolvedValueOnce({
      isBase: false,
      _count: { responses: 0 },
    });
    await service.remove(psychologist, 'm1');
    expect(tx.groupModule.deleteMany).toHaveBeenCalledWith({
      where: { moduleId: 'm1' },
    });
    expect(tx.module.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('assigns a visible module to an own group, idempotently', async () => {
    prisma.group.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.assign(psychologist, 'not-mine', 'm1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.group.findFirst.mockResolvedValueOnce({ id: 'g1' });
    prisma.module.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.assign(psychologist, 'g1', 'someone-elses-module'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.groupModule.createMany).not.toHaveBeenCalled();

    prisma.group.findFirst.mockResolvedValueOnce({ id: 'g1' });
    prisma.module.findFirst.mockResolvedValueOnce({ id: 'm1' });
    await service.assign(psychologist, 'g1', 'm1');
    expect(prisma.groupModule.createMany).toHaveBeenCalledWith({
      data: [{ groupId: 'g1', moduleId: 'm1' }],
      skipDuplicates: true,
    });
  });

  it('unassigns, 404 when nothing was assigned', async () => {
    prisma.group.findFirst.mockResolvedValue({ id: 'g1' });
    prisma.groupModule.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.unassign(psychologist, 'g1', 'm1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
