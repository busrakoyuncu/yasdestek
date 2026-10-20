import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  MAX_UPLOAD_BYTES,
  uploadFileSchema,
  type UploadFileInput,
} from '@yasdestek/shared';
import type { Response } from 'express';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StorageService } from '../storage/storage.service';
import { FilesService } from './files.service';
import { parseRange } from './range';

// Media goes in and out through here only. MinIO itself is never public.
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  // multipart/form-data: "file" plus a "moduleId" field. Held in memory,
  // capped at the largest allowed size; the exact per-type limit is checked next.
  @Roles('USER')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @CurrentUser() me: CurrentUser,
    @Body(new ZodValidationPipe(uploadFileSchema)) body: UploadFileInput,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Attach the file in the "file" field',
      });
    }
    return this.files.upload(me, body.moduleId, file);
  }

  // Streams the bytes, honouring byte ranges so audio can be scrubbed.
  @Get(':id')
  async download(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.files.find(me, id);
    const range = parseRange(rangeHeader, file.size);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');
    if (range) {
      res.status(206);
      res.setHeader(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${file.size}`,
      );
      res.setHeader('Content-Length', range.end - range.start + 1);
    } else {
      res.setHeader('Content-Length', file.size);
    }
    const stream = await this.storage.get(file.storageKey, range);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }

  @Roles('USER')
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.files.remove(me, id);
  }
}
