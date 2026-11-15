import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FILE_RULES, type FileKind, fileKind } from '@yasdestek/shared';
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

  // Checks type, size and the module's switches, stores the bytes, then
  // records the row, so a failed store never leaves a row pointing at nothing.
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
    await this.assertAllowed(me, moduleId, kind);
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

  // Each module says whether its responses may carry images or recordings.
  // The lookup is scoped to my group, so a module that is not mine is a 404
  // here too, never a hint that it exists.
  private async assertAllowed(
    me: CurrentUser,
    moduleId: string,
    kind: FileKind,
  ) {
    if (!me.groupId) throw new NotFoundException();
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, groups: { some: { groupId: me.groupId } } },
      select: { allowImages: true, allowAudio: true },
    });
    if (!module) throw new NotFoundException();
    if (kind === 'image' && !module.allowImages) {
      throw new ForbiddenException({
        code: 'IMAGES_NOT_ALLOWED',
        message: 'This module does not accept images',
      });
    }
    if (kind === 'audio' && !module.allowAudio) {
      throw new ForbiddenException({
        code: 'AUDIO_NOT_ALLOWED',
        message: 'This module does not accept recordings',
      });
    }
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
