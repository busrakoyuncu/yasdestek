import { Module } from '@nestjs/common';
import { ResponsesService } from './responses.service';

@Module({
  providers: [ResponsesService],
})
export class ResponsesModule {}
