import { Injectable, NotFoundException } from '@nestjs/common';
import type { CommentInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Whose forums a caller may read: admins all, psychologists their own groups,
// participants their one group. Only members write; see comment().
function readableGroups(me: CurrentUser): Prisma.GroupWhereInput {
  switch (me.role) {
    case 'ADMIN':
      return {};
    case 'PSYCHOLOGIST':
      return { psychologistId: me.id };
    case 'USER':
      return { id: { in: me.groupId ? [me.groupId] : [] } };
  }
}

const author = { select: { id: true, username: true } };

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  // A group's forum for one module: the members' published responses, each
  // with its files and comments. Removed comments keep their place as a
  // placeholder with no text and no author.
  async read(me: CurrentUser, groupId: string, moduleId: string) {
    const assigned = await this.prisma.groupModule.findFirst({
      where: { groupId, moduleId, group: readableGroups(me) },
      select: { groupId: true },
    });
    if (!assigned) throw new NotFoundException();

    const responses = await this.prisma.response.findMany({
      where: {
        moduleId,
        published: true,
        deletedAt: null,
        user: { groupId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: author,
        files: { omit: { storageKey: true }, orderBy: { createdAt: 'asc' } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author },
        },
      },
    });

    return responses.map((response) => ({
      ...response,
      comments: response.comments.map((comment) =>
        comment.deletedAt
          ? {
              id: comment.id,
              responseId: comment.responseId,
              createdAt: comment.createdAt,
              deletedAt: comment.deletedAt,
              text: null,
              author: null,
            }
          : { ...comment, deletedAt: null },
      ),
    }));
  }

  // Members comment on published responses in their own group, their own included.
  async comment(me: CurrentUser, responseId: string, { text }: CommentInput) {
    const response = await this.prisma.response.findFirst({
      where: {
        id: responseId,
        published: true,
        deletedAt: null,
        user: { groupId: { in: me.groupId ? [me.groupId] : [] } },
      },
      select: { id: true },
    });
    if (!response) throw new NotFoundException();
    return this.prisma.comment.create({
      data: { text, authorId: me.id, responseId },
      include: { author },
    });
  }

  // Soft delete by the group's psychologist or an admin. The row stays, with
  // who removed it, and the forum shows a placeholder instead.
  async removeComment(me: CurrentUser, id: string) {
    const { count } = await this.prisma.comment.updateMany({
      where: {
        id,
        deletedAt: null,
        ...(me.role === 'ADMIN'
          ? {}
          : { response: { user: { psychologistId: me.id } } }),
      },
      data: { deletedAt: new Date(), deletedById: me.id },
    });
    if (count === 0) throw new NotFoundException();
  }
}
