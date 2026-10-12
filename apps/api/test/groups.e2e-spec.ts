import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Accounts are created directly in the database (the users flow has its own
// test). Four logins: admin, two psychologists, one participant.
describe('Groups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-groups-';
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

    const accounts = [
      { name: 'admin', role: 'ADMIN', owner: null },
      { name: 'p1', role: 'PSYCHOLOGIST', owner: null },
      { name: 'p2', role: 'PSYCHOLOGIST', owner: null },
      { name: 'u1', role: 'USER', owner: 'p1' },
      { name: 'u2', role: 'USER', owner: 'p2' },
    ] as const;
    for (const { name, role, owner } of accounts) {
      const user = await prisma.user.create({
        data: {
          username: prefix + name,
          role,
          active: true,
          mustChangePassword: false,
          passwordHash: await argon2.hash('pass-' + name),
          psychologistId: owner ? ids[owner] : null,
        },
      });
      ids[name] = user.id;
    }
    for (const name of ['admin', 'p1', 'p2', 'u1']) {
      cookies[name] = await login(name);
    }
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('a psychologist creates a group; admins and participants cannot', async () => {
    const res = await api()
      .post('/groups')
      .set('Cookie', cookies.p1)
      .send({ name: 'Salı grubu' })
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'Salı grubu',
      psychologistId: ids.p1,
      members: [],
    });
    ids.g1 = (res.body as { id: string }).id;

    const other = await api()
      .post('/groups')
      .set('Cookie', cookies.p2)
      .send({ name: 'Perşembe grubu' })
      .expect(201);
    ids.g2 = (other.body as { id: string }).id;

    await api()
      .post('/groups')
      .set('Cookie', cookies.admin)
      .send({ name: 'x' })
      .expect(403);
    await api().get('/groups').set('Cookie', cookies.u1).expect(403);
  });

  it('members must be own participants, in own groups', async () => {
    await api()
      .post(`/groups/${ids.g1}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: ids.u1 })
      .expect(204);
    await api()
      .post(`/groups/${ids.g1}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: ids.u2 })
      .expect(404);
    await api()
      .post(`/groups/${ids.g2}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: ids.u1 })
      .expect(404);
    await api()
      .post(`/groups/${ids.g1}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: 'not-a-uuid' })
      .expect(400);
  });

  it('reads are scoped: psychologists see own groups, admins see all', async () => {
    await api().get(`/groups/${ids.g1}`).set('Cookie', cookies.p2).expect(404);

    const mine = await api()
      .get('/groups')
      .set('Cookie', cookies.p2)
      .expect(200);
    expect(mine.body).toEqual([expect.objectContaining({ id: ids.g2 })]);

    const all = await api()
      .get('/groups')
      .set('Cookie', cookies.admin)
      .expect(200);
    expect(all.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ids.g1 }),
        expect.objectContaining({ id: ids.g2 }),
      ]),
    );

    const g1 = await api()
      .get(`/groups/${ids.g1}`)
      .set('Cookie', cookies.p1)
      .expect(200);
    expect(g1.body).toMatchObject({
      members: [{ id: ids.u1, username: prefix + 'u1', active: true }],
    });
  });

  it('renames within scope only', async () => {
    await api()
      .patch(`/groups/${ids.g1}`)
      .set('Cookie', cookies.p2)
      .send({ name: 'hijack' })
      .expect(404);
    await api()
      .patch(`/groups/${ids.g1}`)
      .set('Cookie', cookies.p1)
      .send({ name: 'Salı akşam grubu' })
      .expect(204);
    await api()
      .get(`/groups/${ids.g1}`)
      .set('Cookie', cookies.p1)
      .expect(200)
      .expect((res) =>
        expect(res.body).toMatchObject({ name: 'Salı akşam grubu' }),
      );
  });

  it('a participant moves between groups and can be removed', async () => {
    const res = await api()
      .post('/groups')
      .set('Cookie', cookies.p1)
      .send({ name: 'Yeni grup' })
      .expect(201);
    ids.g3 = (res.body as { id: string }).id;

    await api()
      .post(`/groups/${ids.g3}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: ids.u1 })
      .expect(204);
    const g1 = await api()
      .get(`/groups/${ids.g1}`)
      .set('Cookie', cookies.p1)
      .expect(200);
    expect(g1.body).toMatchObject({ members: [] });

    await api()
      .delete(`/groups/${ids.g3}/members/${ids.u1}`)
      .set('Cookie', cookies.p1)
      .expect(204);
    await api()
      .delete(`/groups/${ids.g3}/members/${ids.u1}`)
      .set('Cookie', cookies.p1)
      .expect(404);
  });

  it('deleting a group with members keeps the members', async () => {
    await api()
      .post(`/groups/${ids.g3}/members`)
      .set('Cookie', cookies.p1)
      .send({ userId: ids.u1 })
      .expect(204);
    await api()
      .delete(`/groups/${ids.g3}`)
      .set('Cookie', cookies.p2)
      .expect(404);
    await api()
      .delete(`/groups/${ids.g3}`)
      .set('Cookie', cookies.admin)
      .expect(204);
    await api().get(`/groups/${ids.g3}`).set('Cookie', cookies.p1).expect(404);

    const u1 = await prisma.user.findUniqueOrThrow({ where: { id: ids.u1 } });
    expect(u1).toMatchObject({ active: true, groupId: null });
    await api().get('/auth/me').set('Cookie', cookies.u1).expect(200);
  });
});
