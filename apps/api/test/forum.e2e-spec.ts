import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Comment = {
  id: string;
  text: string | null;
  author: { username: string } | null;
  deletedAt: string | null;
};
type Post = { id: string; user: { username: string }; comments: Comment[] };

// Group g1 (u1, u2) under p1 with one assigned module; group g2 (u3) under p2.
// Six logins.
describe('Forum (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-forum-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  const api = () => request(app.getHttpServer());
  const forum = (cookie: string, group = ids.g1, module = ids.module) =>
    api().get(`/groups/${group}/forum/${module}`).set('Cookie', cookie);
  const comment = (cookie: string, responseId: string, text = 'Yanındayım.') =>
    api()
      .post(`/responses/${responseId}/comments`)
      .set('Cookie', cookie)
      .send({ text });

  async function login(name: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password: 'pass-' + name })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  async function cleanup() {
    const byPrefix = { username: { startsWith: prefix } };
    await prisma.comment.deleteMany({ where: { author: byPrefix } });
    await prisma.response.deleteMany({ where: { user: byPrefix } });
    await prisma.groupModule.deleteMany({
      where: { group: { psychologist: byPrefix } },
    });
    await prisma.module.deleteMany({ where: { createdBy: byPrefix } });
    await prisma.group.deleteMany({ where: { psychologist: byPrefix } });
    for (const role of ['USER', 'PSYCHOLOGIST', 'ADMIN'] as const) {
      await prisma.user.deleteMany({ where: { role, ...byPrefix } });
    }
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const account = async (
      name: string,
      role: 'ADMIN' | 'PSYCHOLOGIST' | 'USER',
      extra = {},
    ) => {
      const user = await prisma.user.create({
        data: {
          username: prefix + name,
          role,
          active: true,
          mustChangePassword: false,
          passwordHash: await argon2.hash('pass-' + name),
          ...extra,
        },
      });
      ids[name] = user.id;
    };
    await account('admin', 'ADMIN');
    await account('p1', 'PSYCHOLOGIST');
    await account('p2', 'PSYCHOLOGIST');
    const g1 = await prisma.group.create({
      data: { name: 'G1', psychologistId: ids.p1 },
    });
    const g2 = await prisma.group.create({
      data: { name: 'G2', psychologistId: ids.p2 },
    });
    ids.g1 = g1.id;
    ids.g2 = g2.id;
    await account('u1', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u2', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u3', 'USER', { psychologistId: ids.p2, groupId: g2.id });
    const module = await prisma.module.create({
      data: {
        title: 'Sözcüklerin Gücü (test)',
        description: 'd',
        rules: 'r',
        questions: ['q'],
        order: 99,
        createdById: ids.p1,
      },
    });
    ids.module = module.id;
    await prisma.groupModule.create({
      data: { groupId: g1.id, moduleId: module.id },
    });
    const base = await prisma.module.findFirstOrThrow({
      where: { isBase: true, order: 1 },
    });
    ids.unassigned = base.id;

    for (const name of ['admin', 'p1', 'p2', 'u1', 'u2', 'u3'])
      cookies[name] = await login(name);

    const save = (cookie: string, body: object) =>
      api()
        .put(`/modules/${ids.module}/response`)
        .set('Cookie', cookie)
        .send(body)
        .expect(200);
    const published = await save(cookies.u1, {
      text: 'Haberi annemden aldım.',
      published: true,
    });
    ids.post = (published.body as { id: string }).id;
    const draft = await save(cookies.u2, { text: 'Taslak', published: false });
    ids.draft = (draft.body as { id: string }).id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('shows members only published responses of their own group', async () => {
    const res = await forum(cookies.u2).expect(200);
    const posts = res.body as Post[];
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: ids.post,
      user: { username: prefix + 'u1' },
      comments: [],
    });

    await forum(cookies.u3).expect(404);
    await forum(cookies.p1).expect(200);
    await forum(cookies.p2).expect(404);
    await forum(cookies.admin).expect(200);
    await forum(cookies.u1, ids.g1, ids.unassigned).expect(404);
  });

  it('only group members comment, only on published responses', async () => {
    const res = await comment(cookies.u2, ids.post).expect(201);
    expect(res.body).toMatchObject({
      text: 'Yanındayım.',
      author: { username: prefix + 'u2' },
    });
    ids.comment = (res.body as { id: string }).id;

    await comment(cookies.u1, ids.post, 'Teşekkür ederim.').expect(201);
    await comment(cookies.u3, ids.post).expect(404);
    await comment(cookies.u2, ids.draft).expect(404);
    await comment(cookies.p1, ids.post).expect(403);
    await comment(cookies.u2, ids.post, '   ').expect(400);

    const feed = await forum(cookies.u1).expect(200);
    const [post] = feed.body as Post[];
    expect(post.comments.map((c) => c.text)).toEqual([
      'Yanındayım.',
      'Teşekkür ederim.',
    ]);
  });

  it('the group psychologist or an admin removes a comment, leaving a placeholder', async () => {
    const remove = (cookie: string, id = ids.comment) =>
      api().delete(`/comments/${id}`).set('Cookie', cookie);
    await remove(cookies.u1).expect(403);
    await remove(cookies.p2).expect(404);
    await remove(cookies.p1).expect(204);
    await remove(cookies.p1).expect(404);

    const feed = await forum(cookies.u2).expect(200);
    const [post] = feed.body as Post[];
    expect(post.comments[0]).toMatchObject({
      id: ids.comment,
      text: null,
      author: null,
    });
    expect(post.comments[0].deletedAt).not.toBeNull();
    expect(post.comments[1]).toMatchObject({ text: 'Teşekkür ederim.' });

    const row = await prisma.comment.findUniqueOrThrow({
      where: { id: ids.comment },
    });
    expect(row).toMatchObject({ text: 'Yanındayım.', deletedById: ids.p1 });

    const second = post.comments[1].id;
    await remove(cookies.admin, second).expect(204);
  });
});
