import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    response: { findMany: jest.fn() },
  };
  const service = new AnalyticsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("gives each participant's latest step, scoped to the caller", async () => {
    prisma.response.findMany.mockResolvedValue([
      {
        userId: 'u1',
        published: true,
        deletedAt: null,
        module: { id: 'm2', title: 'İki' },
      },
      {
        userId: 'u2',
        published: false,
        deletedAt: null,
        module: { id: 'm1', title: 'Bir' },
      },
    ]);
    const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;
    await expect(service.latestSteps(psychologist)).resolves.toEqual([
      { userId: 'u1', module: { id: 'm2', title: 'İki' }, status: 'completed' },
      {
        userId: 'u2',
        module: { id: 'm1', title: 'Bir' },
        status: 'in_progress',
      },
    ]);
    expect(prisma.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          user: { role: 'USER', psychologistId: 'p1' },
        },
        orderBy: { updatedAt: 'desc' },
        distinct: ['userId'],
      }),
    );

    await service.latestSteps({ id: 'a1', role: 'ADMIN' } as CurrentUser);
    expect(prisma.response.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, user: { role: 'USER' } },
      }),
    );
  });

  it('lists psychologists only', async () => {
    await service.psychologists();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'PSYCHOLOGIST' } }),
    );
  });

  it('derives a status per assigned module', async () => {
    const when = new Date();
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'u1',
      username: 'elif',
      active: true,
      psychologist: { id: 'p1', username: 'dr.ayse' },
      group: {
        id: 'g1',
        name: 'G1',
        modules: [
          { module: { id: 'm1', title: 'Bir', order: 1 } },
          { module: { id: 'm2', title: 'İki', order: 2 } },
          { module: { id: 'm3', title: 'Üç', order: 3 } },
          { module: { id: 'm4', title: 'Dört', order: 4 } },
        ],
      },
      responses: [
        { moduleId: 'm1', published: true, deletedAt: null },
        { moduleId: 'm2', published: false, deletedAt: null },
        { moduleId: 'm4', published: true, deletedAt: when },
      ],
    });
    const progress = await service.userProgress('u1');
    expect(progress.group).toEqual({ id: 'g1', name: 'G1' });
    expect(progress).not.toHaveProperty('responses');
    expect(progress.modules.map((m) => [m.title, m.status])).toEqual([
      ['Bir', 'completed'],
      ['İki', 'in_progress'],
      ['Üç', 'not_started'],
      ['Dört', 'not_started'],
    ]);
  });

  it('a participant without a group has no modules', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'u2',
      username: 'kerem',
      active: true,
      psychologist: null,
      group: null,
      responses: [],
    });
    const progress = await service.userProgress('u2');
    expect(progress).toMatchObject({ group: null, modules: [] });
  });

  it('is 404 for unknown ids and non-participants', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.userProgress('p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', role: 'USER' } }),
    );
  });
});
