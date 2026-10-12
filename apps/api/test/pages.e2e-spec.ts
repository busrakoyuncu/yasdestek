import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Reads the seeded general-rules page and restores its text afterwards.
describe('Pages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let original: string;
  const prefix = 'e2e-pages-';
  const cookies: Record<string, string> = {};

  const api = () => request(app.getHttpServer());

  async function login(name: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password: 'pass-' + name })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    for (const [name, role] of [
      ['admin', 'ADMIN'],
      ['user', 'USER'],
    ] as const) {
      await prisma.user.create({
        data: {
          username: prefix + name,
          role,
          active: true,
          mustChangePassword: false,
          passwordHash: await argon2.hash('pass-' + name),
        },
      });
      cookies[name] = await login(name);
    }
    const page = await prisma.contentPage.findUniqueOrThrow({
      where: { slug: 'general-rules' },
    });
    original = page.content;
  });

  afterAll(async () => {
    await prisma.contentPage.update({
      where: { slug: 'general-rules' },
      data: { content: original },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    await app.close();
  });

  it('every role reads a page; unknown slugs are 404', async () => {
    await api()
      .get('/pages/general-rules')
      .set('Cookie', cookies.user)
      .expect(200)
      .expect((res) =>
        expect(res.body).toMatchObject({
          slug: 'general-rules',
          content: original,
        }),
      );
    await api().get('/pages/nope').set('Cookie', cookies.user).expect(404);
    await api().get('/pages/general-rules').expect(401);
  });

  it('only admins edit, and only existing pages', async () => {
    await api()
      .put('/pages/general-rules')
      .set('Cookie', cookies.user)
      .send({ content: 'hijack' })
      .expect(403);
    await api()
      .put('/pages/general-rules')
      .set('Cookie', cookies.admin)
      .send({ content: '   ' })
      .expect(400);
    await api()
      .put('/pages/new-page')
      .set('Cookie', cookies.admin)
      .send({ content: 'x' })
      .expect(404);
    await api()
      .put('/pages/general-rules')
      .set('Cookie', cookies.admin)
      .send({ content: 'Yeni kurallar' })
      .expect(204);
    await api()
      .get('/pages/general-rules')
      .set('Cookie', cookies.user)
      .expect(200)
      .expect((res) =>
        expect(res.body).toMatchObject({ content: 'Yeni kurallar' }),
      );
  });
});
