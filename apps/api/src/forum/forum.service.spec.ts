import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ForumService } from './forum.service';

const admin = { id: 'a1', role: 'ADMIN' } as CurrentUser;
const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;
const member = { id: 'u1', role: 'USER', groupId: 'g1' } as CurrentUser;
const loner = { id: 'u2', role: 'USER', groupId: null } as CurrentUser;

describe('ForumService', () => {
  const prisma = {
    groupModule: { findFirst: jest.fn() },
    response: { findMany: jest.fn(), findFirst: jest.fn() },
    comment: { create: jest.fn(), updateMany: jest.fn() },
  };
  const service = new ForumService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.groupModule.findFirst.mockResolvedValue({ groupId: 'g1' });
    prisma.response.findMany.mockResolvedValue([]);
  });

  it('reads only forums of readable groups, and only assigned modules', async () => {
    for (const [me, group] of [
      [admin, {}],
      [psychologist, { psychologistId: 'p1' }],
      [member, { id: { in: ['g1'] } }],
      [loner, { id: { in: [] } }],
    ] as const) {
      await service.read(me, 'g1', 'm1');
      expect(prisma.groupModule.findFirst).toHaveBeenLastCalledWith({
        where: { groupId: 'g1', moduleId: 'm1', group },
        select: { groupId: true },
      });
    }

    prisma.groupModule.findFirst.mockResolvedValueOnce(null);
    await expect(service.read(member, 'g1', 'm1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.response.findMany).toHaveBeenCalledTimes(4);
  });

  it('lists published, non-removed responses of the group with comments', async () => {
    await service.read(member, 'g1', 'm1');
    expect(prisma.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          moduleId: 'm1',
          published: true,
          deletedAt: null,
          user: { groupId: 'g1' },
        },
      }),
    );
  });

  it('turns removed comments into placeholders', async () => {
    const when = new Date();
    prisma.response.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        comments: [
          {
            id: 'c1',
            responseId: 'r1',
            text: 'Yanındayım',
            createdAt: when,
            deletedAt: null,
            author: { id: 'u2', username: 'kerem' },
          },
          {
            id: 'c2',
            responseId: 'r1',
            text: 'secret',
            createdAt: when,
            deletedAt: when,
            deletedById: 'p1',
            author: { id: 'u3', username: 'ali' },
          },
        ],
      },
    ]);
    const [response] = await service.read(member, 'g1', 'm1');
    expect(response.comments[0]).toMatchObject({
      text: 'Yanındayım',
      author: { username: 'kerem' },
    });
    expect(response.comments[1]).toEqual({
      id: 'c2',
      responseId: 'r1',
      createdAt: when,
      deletedAt: when,
      text: null,
      author: null,
    });
  });

  it('comments only on published responses in my group', async () => {
    prisma.response.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.comment(member, 'r9', { text: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.response.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'r9',
        published: true,
        deletedAt: null,
        user: { groupId: { in: ['g1'] } },
      },
      select: { id: true },
    });

    prisma.response.findFirst.mockResolvedValueOnce({ id: 'r1' });
    await service.comment(member, 'r1', { text: 'Yanındayım' });
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { text: 'Yanındayım', authorId: 'u1', responseId: 'r1' },
      }),
    );
  });

  it('soft deletes within scope: psychologist for own participants, admin anywhere', async () => {
    prisma.comment.updateMany.mockResolvedValue({ count: 1 });
    await service.removeComment(psychologist, 'c1');
    expect(prisma.comment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'c1',
        deletedAt: null,
        response: { user: { psychologistId: 'p1' } },
      },
      data: { deletedAt: expect.any(Date) as Date, deletedById: 'p1' },
    });

    await service.removeComment(admin, 'c1');
    expect(prisma.comment.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'c1', deletedAt: null },
      data: { deletedAt: expect.any(Date) as Date, deletedById: 'a1' },
    });

    prisma.comment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.removeComment(psychologist, 'not-mine'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
