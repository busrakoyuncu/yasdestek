import { Module } from '@nestjs/common';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

@Module({
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}
