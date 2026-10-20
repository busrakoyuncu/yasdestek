import { Module } from '@nestjs/common';
import { ResponsesModule } from '../responses/responses.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [ResponsesModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
