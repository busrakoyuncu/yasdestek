import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { commentSchema, type CommentInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ForumService } from './forum.service';

// Three paths, one feature: read a group's forum for a module, comment on a
// response, remove a comment. Members comment; their psychologist and admins
// read and moderate.
@Controller()
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Get('groups/:groupId/forum/:moduleId')
  read(
    @CurrentUser() me: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.forum.read(me, groupId, moduleId);
  }

  @Roles('USER')
  @Post('responses/:id/comments')
  comment(
    @CurrentUser() me: CurrentUser,
    @Param('id') responseId: string,
    @Body(new ZodValidationPipe(commentSchema)) body: CommentInput,
  ) {
    return this.forum.comment(me, responseId, body);
  }

  @Roles('ADMIN', 'PSYCHOLOGIST')
  @Delete('comments/:id')
  @HttpCode(204)
  removeComment(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.forum.removeComment(me, id);
  }
}
