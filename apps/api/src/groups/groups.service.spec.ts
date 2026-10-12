import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from './groups.service';

const admin = { id: 'a1', role: 'ADMIN' } as CurrentUser;
const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;

describe('GroupsService', () => {
  const tx = {
    group: { findFirst: jest.fn(), delete: jest.fn() },
    user: { updateMany: jest.fn() },
    groupModule: { deleteMany: jest.fn() },
  };
  const prisma = {
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { updateMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
  };
  const service = new GroupsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('creates a group owned by the caller', async () => {
    await service.create(psychologist, { name: 'Salı grubu' });
    expect(prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Salı grubu', psychologistId: 'p1' },
      }),
    );
  });

  it('scopes reads: admin sees all, psychologist sees own', async () => {
    await service.list(admin);
    expect(prisma.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
    await service.list(psychologist);
    expect(prisma.group.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { psychologistId: 'p1' } }),
    );

    prisma.group.findFirst.mockResolvedValueOnce(null);
    await expect(service.get(psychologist, 'g9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('renames within the scope, 404 outside it', async () => {
    prisma.group.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.rename(psychologist, 'g9', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.group.updateMany).toHaveBeenCalledWith({
      where: { id: 'g9', psychologistId: 'p1' },
      data: { name: 'x' },
    });
  });

  it('deletes a group with members: unlinks them, drops assignments, then the group', async () => {
    tx.group.findFirst.mockResolvedValueOnce({ id: 'g1' });
    await service.remove(admin, 'g1');
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { groupId: 'g1' },
      data: { groupId: null },
    });
    expect(tx.groupModule.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 'g1' },
    });
    expect(tx.group.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });

    tx.group.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove(psychologist, 'g2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.group.delete).toHaveBeenCalledTimes(1);
  });

  it('adds only own participants to own groups', async () => {
    prisma.group.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.addMember(psychologist, 'not-mine', 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();

    prisma.group.findFirst.mockResolvedValueOnce({ id: 'g1' });
    prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.addMember(psychologist, 'g1', 'someone-elses-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'someone-elses-user', role: 'USER', psychologistId: 'p1' },
      data: { groupId: 'g1' },
    });
  });

  it('removes a member only from own group', async () => {
    prisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.removeMember(psychologist, 'g1', 'u1');
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', groupId: 'g1', psychologistId: 'p1' },
      data: { groupId: null },
    });

    prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.removeMember(psychologist, 'g1', 'u2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
