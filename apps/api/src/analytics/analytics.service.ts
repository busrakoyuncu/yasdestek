import { Injectable, NotFoundException } from '@nestjs/common';
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

// Admin views only. Reads across every psychologist, so no scoping here;
// the controller limits the role.
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every psychologist with their participants and each participant's group.
  psychologists() {
    return this.prisma.user.findMany({
      where: { role: 'PSYCHOLOGIST' },
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        active: true,
        users: {
          orderBy: { username: 'asc' },
          select: {
            id: true,
            username: true,
            active: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
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
        group: {
          select: {
            id: true,
            name: true,
            modules: {
              orderBy: { module: { order: 'asc' } },
              select: {
                module: { select: { id: true, title: true, order: true } },
              },
            },
          },
        },
        responses: {
          select: { moduleId: true, published: true, deletedAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException();

    const byModule = new Map(user.responses.map((r) => [r.moduleId, r]));
    return {
      id: user.id,
      username: user.username,
      active: user.active,
      psychologist: user.psychologist,
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
      modules: (user.group?.modules ?? []).map(({ module }) => ({
        ...module,
        status: statusOf(byModule.get(module.id)),
      })),
    };
  }
}
