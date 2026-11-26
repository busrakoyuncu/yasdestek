import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

// A module is completed once the response is published, in progress while a
// draft exists, not started otherwise. A removed response counts as not started.
function statusOf(
  response: { published: boolean; deletedAt: Date | null } | undefined,
): ModuleStatus {
  if (!response || response.deletedAt) return 'not_started';
  return response.published ? 'completed' : 'in_progress';
}

// What to read for a participant's progress: their group's modules in order,
// and their responses.
const progressSelect = {
  group: {
    select: {
      id: true,
      name: true,
      modules: {
        orderBy: { module: { order: 'asc' } },
        select: { module: { select: { id: true, title: true, order: true } } },
      },
    },
  },
  responses: { select: { moduleId: true, published: true, deletedAt: true } },
} as const;

type ProgressRow = {
  group: {
    id: string;
    name: string;
    modules: { module: { id: string; title: string; order: number } }[];
  } | null;
  responses: { moduleId: string; published: boolean; deletedAt: Date | null }[];
};

// The group without its modules, and each of its modules with a status.
function progressOf({ group, responses }: ProgressRow) {
  const byModule = new Map(responses.map((r) => [r.moduleId, r]));
  return {
    group: group ? { id: group.id, name: group.name } : null,
    modules: (group?.modules ?? []).map(({ module }) => ({
      ...module,
      status: statusOf(byModule.get(module.id)),
    })),
  };
}

// Mostly admin views, reading across every psychologist; the controller
// limits the role. latestSteps is also open to psychologists and scopes
// itself to their own participants.
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every psychologist with their participants, and for each participant
  // their group and a status per module of it. The whole overview in one
  // request.
  async psychologists() {
    const psychologists = await this.prisma.user.findMany({
      where: { role: 'PSYCHOLOGIST' },
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        active: true,
        users: {
          orderBy: { username: 'asc' },
          select: { id: true, username: true, active: true, ...progressSelect },
        },
      },
    });
    return psychologists.map(({ users, ...psychologist }) => ({
      ...psychologist,
      users: users.map(({ group, responses, ...user }) => ({
        ...user,
        ...progressOf({ group, responses }),
      })),
    }));
  }

  // Where each participant is now: the module they last saved or shared in,
  // with its status. Participants with no response yet are left out. A
  // psychologist sees only their own participants.
  async latestSteps(me: CurrentUser) {
    const responses = await this.prisma.response.findMany({
      where: {
        deletedAt: null,
        user:
          me.role === 'ADMIN'
            ? { role: 'USER' }
            : { role: 'USER', psychologistId: me.id },
      },
      orderBy: { updatedAt: 'desc' },
      distinct: ['userId'],
      select: {
        userId: true,
        published: true,
        deletedAt: true,
        module: { select: { id: true, title: true } },
      },
    });
    return responses.map(({ userId, module, ...response }) => ({
      userId,
      module,
      status: statusOf(response),
    }));
  }

  // One participant: their group's modules in order, each with a status.
  async userProgress(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'USER' },
      select: {
        id: true,
        username: true,
        active: true,
        psychologist: { select: { id: true, username: true } },
        ...progressSelect,
      },
    });
    if (!user) throw new NotFoundException();

    return {
      id: user.id,
      username: user.username,
      active: user.active,
      psychologist: user.psychologist,
      ...progressOf(user),
    };
  }
}
