import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { responseSchema, type ResponseInput } from '@yasdestek/shared';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ResponsesService } from './responses.service';

// A participant's own response to one module. Reading the group's
// published responses is the forum's job.
@Roles('USER')
@Controller('modules/:moduleId/response')
export class ResponsesController {
  constructor(private readonly responses: ResponsesService) {}

  @Get()
  getMine(@CurrentUser() me: CurrentUser, @Param('moduleId') moduleId: string) {
    return this.responses.getMine(me, moduleId);
  }

  // Creates on the first save, updates afterwards. Answers with the saved row.
  @Put()
  save(
    @CurrentUser() me: CurrentUser,
    @Param('moduleId') moduleId: string,
    @Body(new ZodValidationPipe(responseSchema)) body: ResponseInput,
  ) {
    return this.responses.save(me, moduleId, body);
  }
}
