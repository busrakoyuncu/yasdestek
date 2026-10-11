import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    session: { create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AuthService(prisma as unknown as PrismaService);

  let passwordHash: string;
  const user = { id: 'u1', username: 'elif', active: true };

  beforeAll(async () => {
    passwordHash = await argon2.hash('correct-horse');
  });

  beforeEach(() => jest.clearAllMocks());

  async function codeOf(promise: Promise<unknown>) {
    return promise.catch((error: UnauthorizedException) => {
      return (error.getResponse() as { code: string }).code;
    });
  }

  describe('login', () => {
    it('opens a session and returns the user without the hash', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });
      prisma.session.create.mockResolvedValue({ id: 's1', user });

      await expect(
        service.login({ username: 'elif', password: 'correct-horse' }),
      ).resolves.toEqual({ sessionId: 's1', user });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: { userId: 'u1', expiresAt: expect.any(Date) as Date },
        include: { user: { omit: { passwordHash: true } } },
      });
    });

    it('rejects unknown users and wrong passwords the same way', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        codeOf(service.login({ username: 'nobody', password: 'x' })),
      ).resolves.toBe('INVALID_CREDENTIALS');

      prisma.user.findUnique.mockResolvedValueOnce({ ...user, passwordHash });
      await expect(
        codeOf(service.login({ username: 'elif', password: 'wrong' })),
      ).resolves.toBe('INVALID_CREDENTIALS');
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rejects inactive accounts only after the password checks out', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        active: false,
        passwordHash,
      });
      await expect(
        codeOf(service.login({ username: 'elif', password: 'correct-horse' })),
      ).resolves.toBe('ACCOUNT_INACTIVE');
      await expect(
        codeOf(service.login({ username: 'elif', password: 'wrong' })),
      ).resolves.toBe('INVALID_CREDENTIALS');
    });
  });

  describe('changePassword', () => {
    it('rejects a wrong current password', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...user,
        passwordHash,
      });
      await expect(
        service.changePassword('u1', 's1', {
          currentPassword: 'wrong',
          newPassword: 'new-password-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('stores a new hash, clears the flag, and ends other sessions', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...user,
        passwordHash,
      });
      await service.changePassword('u1', 's1', {
        currentPassword: 'correct-horse',
        newPassword: 'new-password-1',
      });

      const [updateArgs] = prisma.user.update.mock.calls[0] as [
        { data: { passwordHash: string; mustChangePassword: boolean } },
      ];
      expect(updateArgs.data.mustChangePassword).toBe(false);
      await expect(
        argon2.verify(updateArgs.data.passwordHash, 'new-password-1'),
      ).resolves.toBe(true);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', id: { not: 's1' } },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
