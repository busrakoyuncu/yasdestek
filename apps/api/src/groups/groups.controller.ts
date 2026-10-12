import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  addMemberSchema,
  groupSchema,
  type AddMemberInput,
  type GroupInput,
} from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GroupsService } from './groups.service';

// Admins read every group and may delete one. Psychologists organise their
// own groups: create, rename, delete, and move their participants in and out.
@Roles('ADMIN', 'PSYCHOLOGIST')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Roles('PSYCHOLOGIST')
  @Post()
  create(
    @CurrentUser() me: CurrentUser,
    @Body(new ZodValidationPipe(groupSchema)) body: GroupInput,
  ) {
    return this.groups.create(me, body);
  }

  @Get()
  list(@CurrentUser() me: CurrentUser) {
    return this.groups.list(me);
  }

  @Get(':id')
  get(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.groups.get(me, id);
  }

  @Roles('PSYCHOLOGIST')
  @Patch(':id')
  @HttpCode(204)
  rename(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(groupSchema)) body: GroupInput,
  ) {
    return this.groups.rename(me, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.groups.remove(me, id);
  }

  @Roles('PSYCHOLOGIST')
  @Post(':id/members')
  @HttpCode(204)
  addMember(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) body: AddMemberInput,
  ) {
    return this.groups.addMember(me, id, body.userId);
  }

  @Roles('PSYCHOLOGIST')
  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.groups.removeMember(me, id, userId);
  }
}
