import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { createUserSchema, type CreateUserInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

// Account management for the roles above: admins and psychologists.
// Which accounts each may touch is decided inside UsersService.
@Roles('ADMIN', 'PSYCHOLOGIST')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Answers with the account and its temporary password, shown this once.
  @Post()
  create(
    @CurrentUser() me: CurrentUser,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    return this.users.create(me, body);
  }

  @Get()
  list(@CurrentUser() me: CurrentUser) {
    return this.users.list(me);
  }

  @Post(':id/activate')
  @HttpCode(204)
  activate(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.users.activate(me, id);
  }

  @Post(':id/deactivate')
  @HttpCode(204)
  deactivate(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.users.deactivate(me, id);
  }

  @Post(':id/reset-password')
  async resetPassword(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
  ): Promise<{ password: string }> {
    return { password: await this.users.resetPassword(me, id) };
  }
  // Privacy request: erases a participant and everything they wrote. Admin only.
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
