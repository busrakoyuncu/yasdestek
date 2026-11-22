import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Roles('ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('psychologists')
  psychologists() {
    return this.analytics.psychologists();
  }

  // Also for psychologists, scoped to their own participants in the service.
  @Roles('ADMIN', 'PSYCHOLOGIST')
  @Get('participants')
  latestSteps(@CurrentUser() me: CurrentUser) {
    return this.analytics.latestSteps(me);
  }

  @Get('users/:id')
  userProgress(@Param('id') id: string) {
    return this.analytics.userProgress(id);
  }
}
