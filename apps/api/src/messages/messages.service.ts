import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SendMessageInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';

// One continuous thread per participant and psychologist pair. A participant
// talks only to their own psychologist, a psychologist only to their own
// participants; everything else is a 404.
@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async send(me: CurrentUser, { recipientId, body }: SendMessageInput) {
    const to = await this.counterpart(me, recipientId);
    return this.prisma.message.create({
      data: { senderId: me.id, recipientId: to, body },
    });
  }

  // The whole conversation with one counterpart, oldest first.
  async thread(me: CurrentUser, userId?: string) {
    const other = await this.counterpart(me, userId);
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: other },
          { senderId: other, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Psychologist's overview: each participant with how many of their
  // messages are still unread. Participants with unread first.
  async inbox(me: CurrentUser) {
    const [participants, unread] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'USER', psychologistId: me.id },
        select: { id: true, username: true, active: true },
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        where: { recipientId: me.id, readAt: null },
        _count: { _all: true },
      }),
    ]);
    const counts = new Map(unread.map((u) => [u.senderId, u._count._all]));
    return participants
      .map((p) => ({ ...p, unread: counts.get(p.id) ?? 0 }))
      .sort(
        (a, b) => b.unread - a.unread || a.username.localeCompare(b.username),
      );
  }

  // Only the recipient marks a message read; doing it twice is a 404.
  async markRead(me: CurrentUser, id: string) {
    const { count } = await this.prisma.message.updateMany({
      where: { id, recipientId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0) throw new NotFoundException();
  }

  // Who I am talking to. Participants: always their psychologist.
  // Psychologists: the named participant, if it is one of theirs.
  private async counterpart(me: CurrentUser, userId?: string): Promise<string> {
    if (me.role === 'USER') {
      if (!me.psychologistId || (userId && userId !== me.psychologistId)) {
        throw new NotFoundException();
      }
      return me.psychologistId;
    }
    if (!userId) {
      throw new BadRequestException({
        code: 'RECIPIENT_REQUIRED',
        message: 'Name the participant to message',
      });
    }
    const participant = await this.prisma.user.findFirst({
      where: { id: userId, role: 'USER', psychologistId: me.id },
      select: { id: true },
    });
    if (!participant) throw new NotFoundException();
    return participant.id;
  }
}
