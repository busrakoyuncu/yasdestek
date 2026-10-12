import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageInput } from '@yasdestek/shared';
import { PrismaService } from '../prisma/prisma.service';

// Pages exist only through the seed (general-rules). Admins edit the text;
// every role reads it.
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(slug: string) {
    const page = await this.prisma.contentPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException();
    return page;
  }

  async update(slug: string, { content }: PageInput) {
    const { count } = await this.prisma.contentPage.updateMany({
      where: { slug },
      data: { content },
    });
    if (count === 0) throw new NotFoundException();
  }
}
