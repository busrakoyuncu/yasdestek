import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ChangePasswordInput, LoginInput } from '@yasdestek/shared';
import * as argon2 from 'argon2';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SESSION_TTL_MS } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Verifies the credentials and opens a session.
  async login({
    username,
    password,
  }: LoginInput): Promise<{ sessionId: string; user: CurrentUser }> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }
    if (!user.active) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is not active yet',
      });
    }
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
      include: { user: { omit: { passwordHash: true } } },
    });
    return { sessionId: session.id, user: session.user };
  }

  // Ends this login only, with its open sockets; other devices stay signed in.
  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    this.realtime.disconnectSession(sessionId);
  }

  // Sets a new password, clears the must-change flag, and ends every other
  // session of this user (and its sockets) so a stolen temporary password
  // stops working.
  async changePassword(
    userId: string,
    sessionId: string,
    { currentPassword, newPassword }: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new BadRequestException({
        code: 'WRONG_PASSWORD',
        message: 'Current password is incorrect',
      });
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.session.deleteMany({
        where: { userId, id: { not: sessionId } },
      }),
    ]);
    this.realtime.disconnectUser(userId, sessionId);
  }
}
