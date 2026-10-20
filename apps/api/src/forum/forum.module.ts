import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';

@Module({
  providers: [ForumService],
})
export class ForumModule {}
