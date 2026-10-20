import { Injectable, NotFoundException } from '@nestjs/common';
import type { ResponseInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Attached media, newest last. The storage key stays inside the api.
const withFiles = {
  files: { omit: { storageKey: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ResponseInclude;

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
      include: withFiles,
    });
  }

  // The response to attach a file to: an empty private draft if none exists yet,
  // so a recording can come before any text.
  async ensure(me: CurrentUser, moduleId: string) {
    await this.assertAssigned(me, moduleId);
    return this.prisma.response.upsert({
      where: { userId_moduleId: { userId: me.id, moduleId } },
      create: { userId: me.id, moduleId },
      update: {},
      select: { id: true },
    });
  }

  async getMine(me: CurrentUser, moduleId: string) {
    const response = await this.prisma.response.findUnique({
      where: { userId_moduleId: { userId: me.id, moduleId } },
      include: withFiles,
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
