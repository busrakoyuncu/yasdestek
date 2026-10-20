import { Module } from '@nestjs/common';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

@Module({
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
