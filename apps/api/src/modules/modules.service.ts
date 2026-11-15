import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ModuleInput, UpdateModuleInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Module, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Scope derives from the creator: base modules (no creator) and admin-created
// modules are global; psychologist-created modules are visible only to that
// psychologist and their groups.
const GLOBAL: Prisma.ModuleWhereInput = {
  OR: [{ createdById: null }, { createdBy: { role: 'ADMIN' } }],
};

// The shared modules a psychologist still works with: not the ones they
// replaced with their own copy, not the ones they removed from their list.
function sharedFor(me: CurrentUser): Prisma.ModuleWhereInput {
  return {
    AND: [
      GLOBAL,
      { copies: { none: { createdById: me.id } } },
      { hiddenBy: { none: { psychologistId: me.id } } },
    ],
  };
}

function visibleTo(me: CurrentUser): Prisma.ModuleWhereInput {
  switch (me.role) {
    case 'ADMIN':
      return {};
    case 'PSYCHOLOGIST':
      return { OR: [sharedFor(me), { createdById: me.id }] };
    case 'USER':
      return me.groupId
        ? { groups: { some: { groupId: me.groupId } } }
        : { id: { in: [] } };
  }
}

// Admins change global modules, psychologists change their own. A
// psychologist's edit or delete of a shared module is handled apart: it
// never touches the shared row (see copy and hide below).
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

  // The creator's name and role ride along so a screen can say whose module
  // it is: seeded (no creator), an admin's (global), or a psychologist's own.
  // A participant also gets the state of their own response per module, so
  // their list can say "not started", "draft" or "shared" in one request.
  list(me: CurrentUser) {
    return this.prisma.module.findMany({
      where: visibleTo(me),
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      include: {
        createdBy: { select: { username: true, role: true } },
        ...(me.role === 'USER' && {
          responses: {
            where: { userId: me.id, deletedAt: null },
            select: { published: true, updatedAt: true },
          },
        }),
      },
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
    const shared = await this.sharedModule(me, id);
    if (shared) return this.copy(me, shared, input);
    const { count } = await this.prisma.module.updateMany({
      where: { id, ...editableBy(me) },
      data: input,
    });
    if (count === 0) throw new NotFoundException();
  }

  // Base modules stay; a module that already has responses stays too,
  // unassign it instead. Nothing a participant wrote is ever dropped here.
  async remove(me: CurrentUser, id: string) {
    const shared = await this.sharedModule(me, id);
    if (shared) return this.hide(me, shared.id);
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
      await tx.hiddenModule.deleteMany({ where: { moduleId: id } });
      await tx.module.delete({ where: { id } });
    });
  }

  // A shared module this psychologist still sees, or null. Admins edit
  // shared modules directly, so for them this is always null.
  private sharedModule(me: CurrentUser, id: string) {
    if (me.role !== 'PSYCHOLOGIST') return null;
    return this.prisma.module.findFirst({ where: { id, ...sharedFor(me) } });
  }

  // A psychologist editing a shared module gets their own copy instead. Their
  // groups switch to it, and what their participants already wrote moves
  // along with its comments and files, so nobody's draft or forum is split.
  // Everyone else keeps the original as it was.
  private async copy(
    me: CurrentUser,
    original: Module,
    input: UpdateModuleInput,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const copy = await tx.module.create({
        data: {
          title: input.title ?? original.title,
          description: input.description ?? original.description,
          rules: input.rules ?? original.rules,
          questions: input.questions ?? original.questions,
          order: input.order ?? original.order,
          allowImages: input.allowImages ?? original.allowImages,
          allowAudio: input.allowAudio ?? original.allowAudio,
          createdById: me.id,
          copiedFromId: original.id,
        },
        select: { id: true },
      });
      await tx.groupModule.updateMany({
        where: { moduleId: original.id, group: { psychologistId: me.id } },
        data: { moduleId: copy.id },
      });
      await tx.response.updateMany({
        where: { moduleId: original.id, user: { psychologistId: me.id } },
        data: { moduleId: copy.id },
      });
    });
  }

  // A psychologist deleting a shared module only takes it off their own
  // list and their groups. Refused while their participants wrote on it,
  // the same rule as a real delete.
  private async hide(me: CurrentUser, moduleId: string) {
    await this.prisma.$transaction(async (tx) => {
      const written = await tx.response.count({
        where: { moduleId, user: { psychologistId: me.id } },
      });
      if (written > 0) {
        throw new ConflictException({
          code: 'MODULE_IN_USE',
          message: 'Module has responses; unassign it instead',
        });
      }
      await tx.groupModule.deleteMany({
        where: { moduleId, group: { psychologistId: me.id } },
      });
      await tx.hiddenModule.createMany({
        data: [{ psychologistId: me.id, moduleId }],
        skipDuplicates: true,
      });
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
