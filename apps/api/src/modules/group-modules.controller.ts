import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { assignModuleSchema, type AssignModuleInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModulesService } from './modules.service';

// Assigning a module to a group is how a psychologist paces the programme:
// the module appears for the whole group at once.
@Roles('PSYCHOLOGIST')
@Controller('groups/:groupId/modules')
export class GroupModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Post()
  @HttpCode(204)
  assign(
    @CurrentUser() me: CurrentUser,
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(assignModuleSchema)) body: AssignModuleInput,
  ) {
    return this.modules.assign(me, groupId, body.moduleId);
  }

  @Delete(':moduleId')
  @HttpCode(204)
  unassign(
    @CurrentUser() me: CurrentUser,
    @Param('groupId') groupId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.modules.unassign(me, groupId, moduleId);
  }
}
