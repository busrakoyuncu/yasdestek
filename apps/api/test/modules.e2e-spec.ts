import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type ModuleRow = { id: string; order: number; isBase: boolean };

// Two psychologists with one group and one participant each. Five logins.
// Relies on the seeded base modules being present.
describe('Modules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-modules-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  const api = () => request(app.getHttpServer());

  const moduleBody = (title: string) => ({
    title,
    description: 'Açıklama',
    rules: 'Kurallar',
    questions: ['Soru 1', 'Soru 2'],
  });

  async function login(name: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password: 'pass-' + name })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  async function listIds(cookie: string) {
    const res = await api().get('/modules').set('Cookie', cookie).expect(200);
    return (res.body as ModuleRow[]).map((m) => m.id);
  }

  async function cleanup() {
    const owned = { createdBy: { username: { startsWith: prefix } } };
    await prisma.groupModule.deleteMany({
      where: {
        OR: [
          { module: owned },
          { group: { psychologist: { username: { startsWith: prefix } } } },
        ],
      },
    });
    await prisma.module.deleteMany({ where: owned });
    await prisma.group.deleteMany({
      where: { psychologist: { username: { startsWith: prefix } } },
    });
    for (const role of ['USER', 'PSYCHOLOGIST', 'ADMIN'] as const) {
      await prisma.user.deleteMany({
        where: { role, username: { startsWith: prefix } },
      });
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

    for (const [name, role] of [
      ['admin', 'ADMIN'],
      ['p1', 'PSYCHOLOGIST'],
      ['p2', 'PSYCHOLOGIST'],
    ] as const) {
      const user = await prisma.user.create({
        data: {
          username: prefix + name,
          role,
          active: true,
          mustChangePassword: false,
          passwordHash: await argon2.hash('pass-' + name),
        },
      });
      ids[name] = user.id;
    }
    for (const p of ['p1', 'p2']) {
      const group = await prisma.group.create({
        data: { name: `${p} grubu`, psychologistId: ids[p] },
      });
      ids[`g-${p}`] = group.id;
      const member = await prisma.user.create({
        data: {
          username: prefix + `u-${p}`,
          role: 'USER',
          active: true,
          mustChangePassword: false,
          passwordHash: await argon2.hash(`pass-u-${p}`),
          psychologistId: ids[p],
          groupId: group.id,
        },
      });
      ids[`u-${p}`] = member.id;
    }
    for (const name of ['admin', 'p1', 'p2', 'u-p1', 'u-p2']) {
      cookies[name] = await login(name);
    }
    const base = await prisma.module.findFirstOrThrow({
      where: { isBase: true, order: 1 },
    });
    ids.base1 = base.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('admins see the seeded base modules', async () => {
    const res = await api()
      .get('/modules')
      .set('Cookie', cookies.admin)
      .expect(200);
    const base = (res.body as ModuleRow[]).filter((m) => m.isBase);
    expect(base).toHaveLength(6);
  });

  it('admins create global modules, psychologists private ones, participants none', async () => {
    const global = await api()
      .post('/modules')
      .set('Cookie', cookies.admin)
      .send(moduleBody('Global'))
      .expect(201);
    expect(global.body).toMatchObject({
      createdById: ids.admin,
      isBase: false,
      order: expect.any(Number) as number,
    });
    expect((global.body as ModuleRow).order).toBeGreaterThan(6);
    ids.global = (global.body as ModuleRow).id;

    for (const p of ['p1', 'p2']) {
      const res = await api()
        .post('/modules')
        .set('Cookie', cookies[p])
        .send(moduleBody(`${p} özel`))
        .expect(201);
      ids[`m-${p}`] = (res.body as ModuleRow).id;
    }

    await api()
      .post('/modules')
      .set('Cookie', cookies['u-p1'])
      .send(moduleBody('x'))
      .expect(403);
    await api()
      .post('/modules')
      .set('Cookie', cookies.p1)
      .send({ ...moduleBody('x'), rules: '' })
      .expect(400);
  });

  it("a psychologist sees global modules and own, never another psychologist's", async () => {
    const seen = await listIds(cookies.p1);
    expect(seen).toEqual(
      expect.arrayContaining([ids.base1, ids.global, ids['m-p1']]),
    );
    expect(seen).not.toContain(ids['m-p2']);
    await api()
      .get(`/modules/${ids['m-p2']}`)
      .set('Cookie', cookies.p1)
      .expect(404);
  });

  it('editing follows the same scope', async () => {
    await api()
      .patch(`/modules/${ids.global}`)
      .set('Cookie', cookies.p1)
      .send({ title: 'hijack' })
      .expect(404);
    await api()
      .patch(`/modules/${ids.global}`)
      .set('Cookie', cookies.admin)
      .send({ title: 'Global v2' })
      .expect(204);
    await api()
      .patch(`/modules/${ids['m-p1']}`)
      .set('Cookie', cookies.p1)
      .send({ questions: ['Tek soru'] })
      .expect(204);
    await api()
      .patch(`/modules/${ids['m-p1']}`)
      .set('Cookie', cookies['u-p1'])
      .send({ title: 'x' })
      .expect(403);
  });

  it('participants see nothing until a module is assigned to their group', async () => {
    expect(await listIds(cookies['u-p1'])).toEqual([]);

    const assign = (cookie: string, group: string, moduleId: string) =>
      api()
        .post(`/groups/${group}/modules`)
        .set('Cookie', cookie)
        .send({ moduleId });

    await assign(cookies.p1, ids['g-p1'], ids['m-p2']).expect(404);
    await assign(cookies.p1, ids['g-p2'], ids['m-p1']).expect(404);
    await assign(cookies.admin, ids['g-p1'], ids.base1).expect(403);
    await assign(cookies.p1, ids['g-p1'], ids['m-p1']).expect(204);
    await assign(cookies.p1, ids['g-p1'], ids['m-p1']).expect(204);
    await assign(cookies.p1, ids['g-p1'], ids.base1).expect(204);

    expect(await listIds(cookies['u-p1'])).toEqual([ids.base1, ids['m-p1']]);
    expect(await listIds(cookies['u-p2'])).toEqual([]);
    await api()
      .get(`/modules/${ids['m-p1']}`)
      .set('Cookie', cookies['u-p2'])
      .expect(404);
    await api()
      .get(`/modules/${ids['m-p1']}`)
      .set('Cookie', cookies['u-p1'])
      .expect(200);
  });

  it('unassigning hides the module again', async () => {
    await api()
      .delete(`/groups/${ids['g-p1']}/modules/${ids.base1}`)
      .set('Cookie', cookies.p1)
      .expect(204);
    await api()
      .delete(`/groups/${ids['g-p1']}/modules/${ids.base1}`)
      .set('Cookie', cookies.p1)
      .expect(404);
    expect(await listIds(cookies['u-p1'])).toEqual([ids['m-p1']]);
  });

  it('base modules cannot be deleted; others only by who may edit them', async () => {
    await api()
      .delete(`/modules/${ids.base1}`)
      .set('Cookie', cookies.admin)
      .expect(403)
      .expect((res) => expect(res.body).toMatchObject({ code: 'BASE_MODULE' }));
    await api()
      .delete(`/modules/${ids.global}`)
      .set('Cookie', cookies.p1)
      .expect(404);
    await api()
      .delete(`/modules/${ids['m-p1']}`)
      .set('Cookie', cookies.p1)
      .expect(204);
    expect(await listIds(cookies['u-p1'])).toEqual([]);
    await api()
      .delete(`/modules/${ids.global}`)
      .set('Cookie', cookies.admin)
      .expect(204);
  });
});
