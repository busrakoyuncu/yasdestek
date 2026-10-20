import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsesService } from '../responses/responses.service';
import { StorageService } from '../storage/storage.service';
import { FilesService } from './files.service';

const admin = { id: 'a1', role: 'ADMIN' } as CurrentUser;
const psychologist = { id: 'p1', role: 'PSYCHOLOGIST' } as CurrentUser;
const member = { id: 'u1', role: 'USER', groupId: 'g1' } as CurrentUser;
const loner = { id: 'u2', role: 'USER', groupId: null } as CurrentUser;

const png = { buffer: Buffer.from('png'), mimetype: 'image/png', size: 3 };

describe('FilesService', () => {
  const prisma = {
    mediaFile: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  };
  const storage = { put: jest.fn(), remove: jest.fn() };
  const responses = { ensure: jest.fn() };
  const service = new FilesService(
    prisma as unknown as PrismaService,
    storage as unknown as StorageService,
    responses as unknown as ResponsesService,
  );

  const codeOf = (promise: Promise<unknown>) =>
    promise.catch(
      (error: BadRequestException) =>
        (error.getResponse() as { code: string }).code,
    );

  beforeEach(() => jest.clearAllMocks());

  it('rejects unsupported types and oversized files before touching storage', async () => {
    await expect(
      codeOf(service.upload(member, 'm1', { ...png, mimetype: 'text/plain' })),
    ).resolves.toBe('UNSUPPORTED_FILE_TYPE');
    await expect(
      codeOf(
        service.upload(member, 'm1', { ...png, size: 10 * 1024 * 1024 + 1 }),
      ),
    ).resolves.toBe('FILE_TOO_LARGE');
    expect(storage.put).not.toHaveBeenCalled();
    expect(responses.ensure).not.toHaveBeenCalled();
  });

  it('accepts audio with codec parameters up to the audio limit', async () => {
    responses.ensure.mockResolvedValueOnce({ id: 'r1' });
    await service.upload(member, 'm1', {
      buffer: Buffer.alloc(0),
      mimetype: 'audio/webm;codecs=opus',
      size: 20 * 1024 * 1024,
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^responses\/r1\/[0-9a-f-]{36}$/),
      expect.any(Buffer),
      'audio/webm',
    );
  });

  it('stores the object before recording the row, on my own draft', async () => {
    responses.ensure.mockResolvedValueOnce({ id: 'r1' });
    await service.upload(member, 'm1', png);
    expect(responses.ensure).toHaveBeenCalledWith(member, 'm1');
    const [key] = storage.put.mock.calls[0] as [string];
    expect(prisma.mediaFile.create).toHaveBeenCalledWith({
      data: {
        storageKey: key,
        mimeType: 'image/png',
        size: 3,
        responseId: 'r1',
        uploaderId: 'u1',
      },
      omit: { storageKey: true },
    });
  });

  it('scopes reads by role', async () => {
    prisma.mediaFile.findFirst.mockResolvedValue({ id: 'f1' });
    await service.find(admin, 'f1');
    expect(prisma.mediaFile.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'f1' },
    });

    await service.find(psychologist, 'f1');
    expect(prisma.mediaFile.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'f1', response: { user: { psychologistId: 'p1' } } },
    });

    await service.find(member, 'f1');
    expect(prisma.mediaFile.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 'f1',
        OR: [
          { uploaderId: 'u1' },
          {
            response: {
              published: true,
              deletedAt: null,
              user: { groupId: 'g1' },
            },
          },
        ],
      },
    });

    await service.find(loner, 'f1');
    expect(prisma.mediaFile.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'f1', OR: [{ uploaderId: 'u2' }, { id: { in: [] } }] },
    });

    prisma.mediaFile.findFirst.mockResolvedValueOnce(null);
    await expect(service.find(member, 'f9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes only own files: row first, then the object', async () => {
    prisma.mediaFile.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove(member, 'f1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.mediaFile.findFirst.mockResolvedValueOnce({ storageKey: 'k1' });
    await service.remove(member, 'f1');
    expect(prisma.mediaFile.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'f1', uploaderId: 'u1' },
      select: { storageKey: true },
    });
    expect(prisma.mediaFile.delete).toHaveBeenCalledWith({
      where: { id: 'f1' },
    });
    expect(storage.remove).toHaveBeenCalledWith('k1');
  });
});
