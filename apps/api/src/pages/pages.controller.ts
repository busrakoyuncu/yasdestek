import { Body, Controller, Get, HttpCode, Param, Put } from '@nestjs/common';
import { pageSchema, type PageInput } from '@yasdestek/shared';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.pages.get(slug);
  }

  @Roles('ADMIN')
  @Put(':slug')
  @HttpCode(204)
  update(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(pageSchema)) body: PageInput,
  ) {
    return this.pages.update(slug, body);
  }
}
