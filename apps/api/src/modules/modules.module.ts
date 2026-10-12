import { Module } from '@nestjs/common';
import { GroupModulesController } from './group-modules.controller';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';

@Module({
  controllers: [ModulesController, GroupModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
