import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsesService } from './responses.service';

const member = { id: 'u1', role: 'USER', groupId: 'g1' } as CurrentUser;
const loner = { id: 'u2', role: 'USER', groupId: null } as CurrentUser;
const input = { text: 'Kaybımı anlatıyorum', published: false };

describe('ResponsesService', () => {
  const prisma = {
    module: { findFirst: jest.fn() },
    response: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  const service = new ResponsesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('saves only to a module assigned to my group', async () => {
    await expect(service.save(loner, 'm1', input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.module.findFirst).not.toHaveBeenCalled();

    prisma.module.findFirst.mockResolvedValueOnce(null);
    await expect(service.save(member, 'm1', input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: { id: 'm1', groups: { some: { groupId: 'g1' } } },
      select: { id: true },
    });
    expect(prisma.response.upsert).not.toHaveBeenCalled();
  });

  it('creates on first save and updates afterwards through one upsert', async () => {
    prisma.module.findFirst.mockResolvedValueOnce({ id: 'm1' });
    await service.save(member, 'm1', input);
    expect(prisma.response.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_moduleId: { userId: 'u1', moduleId: 'm1' } },
        create: { userId: 'u1', moduleId: 'm1', ...input },
        update: input,
      }),
    );
  });

  it('ensures a draft exists without touching an existing one', async () => {
    prisma.module.findFirst.mockResolvedValueOnce({ id: 'm1' });
    await service.ensure(member, 'm1');
    expect(prisma.response.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'u1', moduleId: 'm1' },
        update: {},
      }),
    );
  });

  it('reads my own response, 404 when I have none', async () => {
    prisma.response.findUnique.mockResolvedValueOnce(null);
    await expect(service.getMine(member, 'm1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
