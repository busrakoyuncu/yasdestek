import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// One psychologist with a group, a member, a participant without a group,
// and one private module assigned to the group. Three logins.
describe('Responses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-responses-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  const api = () => request(app.getHttpServer());
  const path = (moduleId: string) => `/modules/${moduleId}/response`;

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
    for (const role of ['USER', 'PSYCHOLOGIST'] as const) {
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
      role: 'PSYCHOLOGIST' | 'USER',
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
    await account('p1', 'PSYCHOLOGIST');
    const group = await prisma.group.create({
      data: { name: 'Grup', psychologistId: ids.p1 },
    });
    await account('u1', 'USER', { psychologistId: ids.p1, groupId: group.id });
    await account('u2', 'USER', { psychologistId: ids.p1 });
    const module = await prisma.module.create({
      data: {
        title: 'Özel modül',
        description: 'd',
        rules: 'r',
        questions: ['q'],
        order: 99,
        createdById: ids.p1,
      },
    });
    ids.module = module.id;
    await prisma.groupModule.create({
      data: { groupId: group.id, moduleId: module.id },
    });
    const base = await prisma.module.findFirstOrThrow({
      where: { isBase: true, order: 1 },
    });
    ids.unassigned = base.id;

    for (const name of ['p1', 'u1', 'u2']) cookies[name] = await login(name);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('a participant has no response until the first save', async () => {
    await api().get(path(ids.module)).set('Cookie', cookies.u1).expect(404);
  });

  it('the first save creates a private empty draft by default', async () => {
    const res = await api()
      .put(path(ids.module))
      .set('Cookie', cookies.u1)
      .send({})
      .expect(200);
    expect(res.body).toMatchObject({
      userId: ids.u1,
      moduleId: ids.module,
      text: '',
      published: false,
    });
    ids.response = (res.body as { id: string }).id;
  });

  it('later saves update the same row', async () => {
    await api()
      .put(path(ids.module))
      .set('Cookie', cookies.u1)
      .send({ text: '  Haberi annemden aldım.  ', published: true })
      .expect(200)
      .expect((res) =>
        expect(res.body).toMatchObject({
          id: ids.response,
          text: 'Haberi annemden aldım.',
          published: true,
        }),
      );
    await api()
      .get(path(ids.module))
      .set('Cookie', cookies.u1)
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ id: ids.response }));
    await expect(
      prisma.response.count({ where: { userId: ids.u1 } }),
    ).resolves.toBe(1);
  });

  it('rejects modules not assigned to my group, and participants without a group', async () => {
    await api()
      .put(path(ids.unassigned))
      .set('Cookie', cookies.u1)
      .send({ text: 'x' })
      .expect(404);
    await api()
      .put(path(ids.module))
      .set('Cookie', cookies.u2)
      .send({ text: 'x' })
      .expect(404);
  });

  it('only participants respond; bad bodies are 400', async () => {
    await api()
      .put(path(ids.module))
      .set('Cookie', cookies.p1)
      .send({ text: 'x' })
      .expect(403);
    await api()
      .put(path(ids.module))
      .set('Cookie', cookies.u1)
      .send({ text: 42 })
      .expect(400);
  });
});
