import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateUserInput } from '@yasdestek/shared';
import * as argon2 from 'argon2';
import { CurrentUser } from '../common/current-user';
import { generatePassword } from '../common/password';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Who a caller may manage. Admins manage every non-admin account;
// psychologists manage their own participants. Used inside every query so
// "not yours" and "not found" are the same 404.
function managedBy(me: CurrentUser): Prisma.UserWhereInput {
  return me.role === 'ADMIN'
    ? { role: { not: 'ADMIN' } }
    : { role: 'USER', psychologistId: me.id };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates an inactive account with a temporary password, returned once.
  async create(me: CurrentUser, input: CreateUserInput) {
    const psychologistId = await this.resolvePsychologistId(me, input);
    const password = generatePassword();
    try {
      const user = await this.prisma.user.create({
        data: {
          role: input.role,
          username: input.username,
          passwordHash: await argon2.hash(password),
          psychologistId,
        },
        omit: { passwordHash: true },
      });
      return { user, password };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken',
        });
      }
      throw error;
    }
  }

  list(me: CurrentUser) {
    return this.prisma.user.findMany({
      where: managedBy(me),
      omit: { passwordHash: true },
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
    });
  }

  async activate(me: CurrentUser, id: string): Promise<void> {
    const { count } = await this.prisma.user.updateMany({
      where: { id, ...managedBy(me) },
      data: { active: true },
    });
    if (count === 0) throw new NotFoundException();
  }

  // Deactivation and ending the sessions happen together, so the next
  // request from that user is rejected.
  async deactivate(me: CurrentUser, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id, ...managedBy(me) },
        data: { active: false },
      });
      if (count === 0) throw new NotFoundException();
      await tx.session.deleteMany({ where: { userId: id } });
    });
  }

  // New temporary password, returned once. The owner must change it at next login.
  async resetPassword(me: CurrentUser, id: string): Promise<string> {
    const password = generatePassword();
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id, ...managedBy(me) },
        data: { passwordHash, mustChangePassword: true },
      });
      if (count === 0) throw new NotFoundException();
      await tx.session.deleteMany({ where: { userId: id } });
    });
    return password;
  }

  private async resolvePsychologistId(
    me: CurrentUser,
    input: CreateUserInput,
  ): Promise<string | null> {
    if (me.role === 'PSYCHOLOGIST') {
      if (input.role !== 'USER') {
        throw new ForbiddenException(
          'Psychologists can only create participants',
        );
      }
      return me.id;
    }
    if (input.role === 'PSYCHOLOGIST') return null;
    if (!input.psychologistId) {
      throw new BadRequestException({
        code: 'PSYCHOLOGIST_REQUIRED',
        message: 'A participant must belong to a psychologist',
      });
    }
    const psychologist = await this.prisma.user.findFirst({
      where: { id: input.psychologistId, role: 'PSYCHOLOGIST' },
      select: { id: true },
    });
    if (!psychologist) throw new NotFoundException('Psychologist not found');
    return psychologist.id;
  }
}
