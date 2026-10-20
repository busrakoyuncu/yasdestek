import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { sendMessageSchema, type SendMessageInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MessagesService } from './messages.service';

// Private messaging between participants and their psychologist. Admins are
// not part of it in v1.
@Roles('USER', 'PSYCHOLOGIST')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Participant: my thread. Psychologist: inbox with unread counts.
  @Get()
  list(@CurrentUser() me: CurrentUser) {
    return me.role === 'USER'
      ? this.messages.thread(me)
      : this.messages.inbox(me);
  }

  @Roles('PSYCHOLOGIST')
  @Get(':userId')
  thread(@CurrentUser() me: CurrentUser, @Param('userId') userId: string) {
    return this.messages.thread(me, userId);
  }

  @Post()
  send(
    @CurrentUser() me: CurrentUser,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    return this.messages.send(me, body);
  }

  @Patch(':id/read')
  @HttpCode(204)
  markRead(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.messages.markRead(me, id);
  }
}
