import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Progress = {
  group: { name: string } | null;
  modules: { id: string; status: string }[];
};

// p1 with group g1 (u1) and a groupless u2; two modules assigned, u1 has a
// draft on one. Rows are created directly; two logins.
describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-analytics-';
  const ids: Record<string, string> = {};
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

  async function cleanup() {
    const byPrefix = { username: { startsWith: prefix } };
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
    const g1 = await prisma.group.create({
      data: { name: 'Salı grubu', psychologistId: ids.p1 },
    });
    await account('u1', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u2', 'USER', { psychologistId: ids.p1 });
    const base = await prisma.module.findFirstOrThrow({
      where: { isBase: true, order: 1 },
    });
    const own = await prisma.module.create({
      data: {
        title: 'Özel',
        description: 'd',
        rules: 'r',
        questions: ['q'],
        order: 99,
        createdById: ids.p1,
      },
    });
    ids.base = base.id;
    ids.own = own.id;
    await prisma.groupModule.createMany({
      data: [
        { groupId: g1.id, moduleId: own.id },
        { groupId: g1.id, moduleId: base.id },
      ],
    });
    await prisma.response.create({
      data: { userId: ids.u1, moduleId: own.id, text: 'taslak' },
    });
    for (const name of ['admin', 'p1']) cookies[name] = await login(name);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('is admin only', async () => {
    await api()
      .get('/analytics/psychologists')
      .set('Cookie', cookies.p1)
      .expect(403);
    await api()
      .get(`/analytics/users/${ids.u1}`)
      .set('Cookie', cookies.p1)
      .expect(403);
  });

  it('lists psychologists with their participants and groups', async () => {
    const res = await api()
      .get('/analytics/psychologists')
      .set('Cookie', cookies.admin)
      .expect(200);
    const p1 = (res.body as { id: string; users: unknown[] }[]).find(
      (p) => p.id === ids.p1,
    );
    expect(p1).toMatchObject({
      username: prefix + 'p1',
      users: [
        { id: ids.u1, group: { name: 'Salı grubu' } },
        { id: ids.u2, group: null },
      ],
    });
  });

  it('reports a status per assigned module, in module order', async () => {
    const progress = (cookie = cookies.admin) =>
      api().get(`/analytics/users/${ids.u1}`).set('Cookie', cookie).expect(200);

    const before = (await progress()).body as Progress;
    expect(before.group).toEqual(
      expect.objectContaining({ name: 'Salı grubu' }),
    );
    expect(before.modules.map((m) => [m.id, m.status])).toEqual([
      [ids.base, 'not_started'],
      [ids.own, 'in_progress'],
    ]);

    await prisma.response.updateMany({
      where: { userId: ids.u1 },
      data: { published: true },
    });
    const after = (await progress()).body as Progress;
    expect(after.modules[1].status).toBe('completed');

    const loner = await api()
      .get(`/analytics/users/${ids.u2}`)
      .set('Cookie', cookies.admin)
      .expect(200);
    expect(loner.body).toMatchObject({ group: null, modules: [] });
    await api()
      .get(`/analytics/users/${ids.p1}`)
      .set('Cookie', cookies.admin)
      .expect(404);
  });
});
