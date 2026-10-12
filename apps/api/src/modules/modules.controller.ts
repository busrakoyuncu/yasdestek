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
  moduleSchema,
  updateModuleSchema,
  type ModuleInput,
  type UpdateModuleInput,
} from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModulesService } from './modules.service';

// Everyone lists and reads what is visible to them: admins everything,
// psychologists global plus own, participants what their group was assigned.
@Controller('modules')
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Roles('ADMIN', 'PSYCHOLOGIST')
  @Post()
  create(
    @CurrentUser() me: CurrentUser,
    @Body(new ZodValidationPipe(moduleSchema)) body: ModuleInput,
  ) {
    return this.modules.create(me, body);
  }

  @Get()
  list(@CurrentUser() me: CurrentUser) {
    return this.modules.list(me);
  }

  @Get(':id')
  get(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.modules.get(me, id);
  }

  @Roles('ADMIN', 'PSYCHOLOGIST')
  @Patch(':id')
  @HttpCode(204)
  update(
    @CurrentUser() me: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateModuleSchema)) body: UpdateModuleInput,
  ) {
    return this.modules.update(me, id, body);
  }

  @Roles('ADMIN', 'PSYCHOLOGIST')
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() me: CurrentUser, @Param('id') id: string) {
    return this.modules.remove(me, id);
  }
}
