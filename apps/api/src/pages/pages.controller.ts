import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  pageLocaleQuerySchema,
  pageSchema,
  type PageInput,
  type PageLocale,
} from '@yasdestek/shared';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PagesService } from './pages.service';

// `?locale=tr|en|de` picks the language on both routes; without it, Turkish.
@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get(':slug')
  get(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(pageLocaleQuerySchema))
    { locale }: { locale: PageLocale },
  ) {
    return this.pages.get(slug, locale);
  }

  @Roles('ADMIN')
  @Put(':slug')
  @HttpCode(204)
  update(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(pageLocaleQuerySchema))
    { locale }: { locale: PageLocale },
    @Body(new ZodValidationPipe(pageSchema)) body: PageInput,
  ) {
    return this.pages.update(slug, locale, body);
  }
}
