import type { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';

// Session cookie value -> the signed-in user, or null when the session is
// missing, unknown, expired, or its user is inactive. The one place these
// rules live: the HTTP session guard and the realtime gateway both use it.
export async function findSessionUser(
  prisma: PrismaService,
  sessionId: string | undefined,
): Promise<CurrentUser | null> {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { omit: { passwordHash: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) {
    return null;
  }
  return session.user;
}
