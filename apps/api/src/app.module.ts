import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppExceptionFilter } from './common/app-exception.filter';
import { RolesGuard } from './common/roles.guard';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
