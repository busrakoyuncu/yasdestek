import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageInput, PageLocale } from '@yasdestek/shared';
import { PrismaService } from '../prisma/prisma.service';

// Pages exist only through the seed (general-rules), one row per language.
// Admins edit each language's text; every role reads it.
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  // The page in the asked language, or the Turkish one while a translation
  // is missing. The answer's `locale` says which one came back.
  async get(slug: string, locale: PageLocale) {
    const pages = await this.prisma.contentPage.findMany({
      where: { slug, locale: { in: [locale, 'tr'] } },
    });
    const page =
      pages.find((p) => p.locale === locale) ??
      pages.find((p) => p.locale === 'tr');
    if (!page) throw new NotFoundException();
    return page;
  }

  async update(slug: string, locale: PageLocale, { content }: PageInput) {
    const { count } = await this.prisma.contentPage.updateMany({
      where: { slug, locale },
      data: { content },
    });
    if (count === 0) throw new NotFoundException();
  }
}
