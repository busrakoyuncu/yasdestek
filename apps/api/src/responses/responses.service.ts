import { Injectable, NotFoundException } from '@nestjs/common';
import type { ResponseInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';

// One response per participant per module. Only modules assigned to the
// participant's group accept one; anything else is a 404.
@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates on the first save, updates afterwards.
  async save(me: CurrentUser, moduleId: string, input: ResponseInput) {
    await this.assertAssigned(me, moduleId);
    return this.prisma.response.upsert({
      where: { userId_moduleId: { userId: me.id, moduleId } },
      create: { userId: me.id, moduleId, ...input },
      update: input,
    });
  }

  async getMine(me: CurrentUser, moduleId: string) {
    const response = await this.prisma.response.findUnique({
      where: { userId_moduleId: { userId: me.id, moduleId } },
    });
    if (!response) throw new NotFoundException();
    return response;
  }

  private async assertAssigned(me: CurrentUser, moduleId: string) {
    if (!me.groupId) throw new NotFoundException();
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, groups: { some: { groupId: me.groupId } } },
      select: { id: true },
    });
    if (!module) throw new NotFoundException();
  }
}
