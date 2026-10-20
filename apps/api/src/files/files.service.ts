import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FILE_RULES, fileKind } from '@yasdestek/shared';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../common/current-user';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsesService } from '../responses/responses.service';
import { StorageService } from '../storage/storage.service';

export type Upload = { buffer: Buffer; mimetype: string; size: number };

// Who may read a file: its uploader, the uploader's psychologist, an admin,
// and group mates once the response is published and not removed.
function readableBy(me: CurrentUser): Prisma.MediaFileWhereInput {
  switch (me.role) {
    case 'ADMIN':
      return {};
    case 'PSYCHOLOGIST':
      return { response: { user: { psychologistId: me.id } } };
    case 'USER':
      return {
        OR: [
          { uploaderId: me.id },
          me.groupId
            ? {
                response: {
                  published: true,
                  deletedAt: null,
                  user: { groupId: me.groupId },
                },
              }
            : { id: { in: [] } },
        ],
      };
  }
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly responses: ResponsesService,
  ) {}

  // Checks type and size, stores the bytes, then records the row, so a
  // failed store never leaves a row pointing at nothing.
  async upload(me: CurrentUser, moduleId: string, file: Upload) {
    const mimeType = file.mimetype.split(';')[0].trim().toLowerCase();
    const kind = fileKind(mimeType);
    if (!kind) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `Unsupported file type: ${mimeType}`,
      });
    }
    if (file.size > FILE_RULES[kind].maxBytes) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `${kind} files may be at most ${FILE_RULES[kind].maxBytes} bytes`,
      });
    }
    const response = await this.responses.ensure(me, moduleId);
    const storageKey = `responses/${response.id}/${randomUUID()}`;
    await this.storage.put(storageKey, file.buffer, mimeType);
    return this.prisma.mediaFile.create({
      data: {
        storageKey,
        mimeType,
        size: file.size,
        responseId: response.id,
        uploaderId: me.id,
      },
      omit: { storageKey: true },
    });
  }

  async find(me: CurrentUser, id: string) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id, ...readableBy(me) },
    });
    if (!file) throw new NotFoundException();
    return file;
  }

  // Row first, then the object: a leftover object is harmless, a dangling row is not.
  async remove(me: CurrentUser, id: string) {
    const file = await this.prisma.mediaFile.findFirst({
      where: { id, uploaderId: me.id },
      select: { storageKey: true },
    });
    if (!file) throw new NotFoundException();
    await this.prisma.mediaFile.delete({ where: { id } });
    await this.storage.remove(file.storageKey);
  }
}
