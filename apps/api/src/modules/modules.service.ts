import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ModuleInput, UpdateModuleInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Scope derives from the creator: base modules (no creator) and admin-created
// modules are global; psychologist-created modules are visible only to that
// psychologist and their groups.
const GLOBAL: Prisma.ModuleWhereInput = {
  OR: [{ createdById: null }, { createdBy: { role: 'ADMIN' } }],
};

function visibleTo(me: CurrentUser): Prisma.ModuleWhereInput {
  switch (me.role) {
    case 'ADMIN':
      return {};
    case 'PSYCHOLOGIST':
      return { OR: [GLOBAL, { createdById: me.id }] };
    case 'USER':
      return me.groupId
        ? { groups: { some: { groupId: me.groupId } } }
        : { id: { in: [] } };
  }
}

// Admins change global modules, psychologists change their own.
function editableBy(me: CurrentUser): Prisma.ModuleWhereInput {
  return me.role === 'ADMIN' ? GLOBAL : { createdById: me.id };
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(me: CurrentUser, input: ModuleInput) {
    const order = input.order ?? (await this.nextOrder(me));
    return this.prisma.module.create({
      data: { ...input, order, createdById: me.id },
    });
  }

  list(me: CurrentUser) {
    return this.prisma.module.findMany({
      where: visibleTo(me),
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
  }

  async get(me: CurrentUser, id: string) {
    const module = await this.prisma.module.findFirst({
      where: { id, ...visibleTo(me) },
    });
    if (!module) throw new NotFoundException();
    return module;
  }

  async update(me: CurrentUser, id: string, input: UpdateModuleInput) {
    const { count } = await this.prisma.module.updateMany({
      where: { id, ...editableBy(me) },
      data: input,
    });
    if (count === 0) throw new NotFoundException();
  }

  // Base modules stay; a module that already has responses stays too,
  // unassign it instead. Nothing a participant wrote is ever dropped here.
  async remove(me: CurrentUser, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const module = await tx.module.findFirst({
        where: { id, ...editableBy(me) },
        select: { isBase: true, _count: { select: { responses: true } } },
      });
      if (!module) throw new NotFoundException();
      if (module.isBase) {
        throw new ForbiddenException({
          code: 'BASE_MODULE',
          message: 'Base modules cannot be deleted',
        });
      }
      if (module._count.responses > 0) {
        throw new ConflictException({
          code: 'MODULE_IN_USE',
          message: 'Module has responses; unassign it instead',
        });
      }
      await tx.groupModule.deleteMany({ where: { moduleId: id } });
      await tx.module.delete({ where: { id } });
    });
  }

  // Assigning is what makes a module appear for a group's participants.
  // Own group, visible module; assigning twice is harmless.
  async assign(me: CurrentUser, groupId: string, moduleId: string) {
    await this.ownGroup(me, groupId);
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, ...visibleTo(me) },
      select: { id: true },
    });
    if (!module) throw new NotFoundException();
    await this.prisma.groupModule.createMany({
      data: [{ groupId, moduleId }],
      skipDuplicates: true,
    });
  }

  async unassign(me: CurrentUser, groupId: string, moduleId: string) {
    await this.ownGroup(me, groupId);
    const { count } = await this.prisma.groupModule.deleteMany({
      where: { groupId, moduleId },
    });
    if (count === 0) throw new NotFoundException();
  }

  private async ownGroup(me: CurrentUser, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, psychologistId: me.id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException();
  }

  private async nextOrder(me: CurrentUser) {
    const last = await this.prisma.module.aggregate({
      where: visibleTo(me),
      _max: { order: true },
    });
    return (last._max.order ?? 0) + 1;
  }
}
