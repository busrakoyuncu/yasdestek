import { Injectable, NotFoundException } from '@nestjs/common';
import type { GroupInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Admins see every group; psychologists see and change their own.
function managedGroups(me: CurrentUser): Prisma.GroupWhereInput {
  return me.role === 'ADMIN' ? {} : { psychologistId: me.id };
}

const withMembers = {
  members: {
    select: { id: true, username: true, active: true },
    orderBy: { username: 'asc' },
  },
} satisfies Prisma.GroupInclude;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(me: CurrentUser, { name }: GroupInput) {
    return this.prisma.group.create({
      data: { name, psychologistId: me.id },
      include: withMembers,
    });
  }

  list(me: CurrentUser) {
    return this.prisma.group.findMany({
      where: managedGroups(me),
      include: withMembers,
      orderBy: { name: 'asc' },
    });
  }

  async get(me: CurrentUser, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, ...managedGroups(me) },
      include: withMembers,
    });
    if (!group) throw new NotFoundException();
    return group;
  }

  async rename(me: CurrentUser, id: string, { name }: GroupInput) {
    const { count } = await this.prisma.group.updateMany({
      where: { id, ...managedGroups(me) },
      data: { name },
    });
    if (count === 0) throw new NotFoundException();
  }

  // Members keep their accounts and content; they just leave the group.
  async remove(me: CurrentUser, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findFirst({
        where: { id, ...managedGroups(me) },
        select: { id: true },
      });
      if (!group) throw new NotFoundException();
      await tx.user.updateMany({
        where: { groupId: id },
        data: { groupId: null },
      });
      await tx.groupModule.deleteMany({ where: { groupId: id } });
      await tx.group.delete({ where: { id } });
    });
  }

  // Only the psychologist's own participants, into the psychologist's own group.
  // A participant already in another group simply moves.
  async addMember(me: CurrentUser, groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, psychologistId: me.id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException();
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, role: 'USER', psychologistId: me.id },
      data: { groupId },
    });
    if (count === 0) throw new NotFoundException();
  }

  async removeMember(me: CurrentUser, groupId: string, userId: string) {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, groupId, psychologistId: me.id },
      data: { groupId: null },
    });
    if (count === 0) throw new NotFoundException();
  }
}
