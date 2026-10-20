import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';

const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;
const member = { id: 'u1', role: 'USER', psychologistId: 'p1' } as CurrentUser;
const orphan = { id: 'u2', role: 'USER', psychologistId: null } as CurrentUser;

describe('MessagesService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new MessagesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('a participant always writes to their own psychologist', async () => {
    await service.send(member, { body: 'Merhaba' });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { senderId: 'u1', recipientId: 'p1', body: 'Merhaba' },
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();

    await expect(
      service.send(member, { recipientId: 'p2', body: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.send(orphan, { body: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('a psychologist names one of their own participants', async () => {
    await expect(
      service.send(psychologist, { body: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.send(psychologist, { recipientId: 'u9', body: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'u9', role: 'USER', psychologistId: 'p1' },
      select: { id: true },
    });

    prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1' });
    await service.send(psychologist, { recipientId: 'u1', body: 'Nasılsın?' });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { senderId: 'p1', recipientId: 'u1', body: 'Nasılsın?' },
    });
  });

  it('a thread holds both directions, oldest first', async () => {
    await service.thread(member);
    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { senderId: 'u1', recipientId: 'p1' },
          { senderId: 'p1', recipientId: 'u1' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('the inbox lists own participants with unread counts, unread first', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', username: 'elif', active: true },
      { id: 'u3', username: 'ayse', active: true },
      { id: 'u2', username: 'kerem', active: true },
    ]);
    prisma.message.groupBy.mockResolvedValueOnce([
      { senderId: 'u2', _count: { _all: 2 } },
    ]);
    const inbox = await service.inbox(psychologist);
    expect(inbox.map((i) => [i.username, i.unread])).toEqual([
      ['kerem', 2],
      ['ayse', 0],
      ['elif', 0],
    ]);
    expect(prisma.message.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: 'p1', readAt: null } }),
    );
  });

  it('only the recipient marks a message read, once', async () => {
    prisma.message.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.markRead(member, 'm1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', recipientId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) as Date },
    });
  });
});
