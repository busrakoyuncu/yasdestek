import { Controller, Get, Param } from '@nestjs/common';
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

  @Get('users/:id')
  userProgress(@Param('id') id: string) {
    return this.analytics.userProgress(id);
  }
}
