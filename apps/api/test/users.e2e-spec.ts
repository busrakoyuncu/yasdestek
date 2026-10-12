import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Created = {
  user: { id: string; psychologistId: string | null };
  password: string;
};

// The provisioning chain through the api: admin -> psychologists -> participants.
// Every account is prefixed so cleanup can find it. Six logins in total,
// under the rate limit of the app instance.
describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-users-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  const temp: Record<string, string> = {};

  const api = () => request(app.getHttpServer());

  async function login(name: string, password: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  // First login with the temporary password, then set an own one.
  async function firstLogin(name: string) {
    const cookie = await login(name, temp[name]);
    await api()
      .post('/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: temp[name], newPassword: `${name}-own-pass` })
      .expect(204);
    return cookie;
  }

  async function create(cookie: string, body: object, status = 201) {
    const res = await api()
      .post('/users')
      .set('Cookie', cookie)
      .send(body)
      .expect(status);
    return res.body as Created & { code?: string };
  }

  async function cleanup() {
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
    await prisma.user.create({
      data: {
        username: prefix + 'admin',
        role: 'ADMIN',
        active: true,
        mustChangePassword: false,
        passwordHash: await argon2.hash('admin-pass-1'),
      },
    });
    cookies.admin = await login('admin', 'admin-pass-1');
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('admin creates psychologists: inactive, temporary password shown once', async () => {
    for (const name of ['p1', 'p2']) {
      const body = await create(cookies.admin, {
        role: 'PSYCHOLOGIST',
        username: prefix + name,
      });
      expect(body.user).toMatchObject({
        role: 'PSYCHOLOGIST',
        active: false,
        mustChangePassword: true,
        psychologistId: null,
      });
      expect(body.user).not.toHaveProperty('passwordHash');
      ids[name] = body.user.id;
      temp[name] = body.password;
    }
  });

  it('rejects a taken username and a participant without a psychologist', async () => {
    const dup = await create(
      cookies.admin,
      { role: 'PSYCHOLOGIST', username: prefix + 'p1' },
      409,
    );
    expect(dup.code).toBe('USERNAME_TAKEN');
    const orphan = await create(
      cookies.admin,
      { role: 'USER', username: prefix + 'orphan' },
      400,
    );
    expect(orphan.code).toBe('PSYCHOLOGIST_REQUIRED');
  });

  it('inactive accounts cannot log in until activated', async () => {
    await api()
      .post('/auth/login')
      .send({ username: prefix + 'p1', password: temp.p1 })
      .expect(401)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'ACCOUNT_INACTIVE' }),
      );
    for (const name of ['p1', 'p2']) {
      await api()
        .post(`/users/${ids[name]}/activate`)
        .set('Cookie', cookies.admin)
        .expect(204);
      cookies[name] = await firstLogin(name);
    }
  });

  it('a psychologist creates own participants only', async () => {
    const body = await create(cookies.p1, {
      role: 'USER',
      username: prefix + 'u1',
      psychologistId: ids.p2,
    });
    expect(body.user.psychologistId).toBe(ids.p1);
    ids.u1 = body.user.id;
    temp.u1 = body.password;

    await create(
      cookies.p1,
      { role: 'PSYCHOLOGIST', username: prefix + 'p3' },
      403,
    );
  });

  it('another psychologist gets 404 on that participant and never lists them', async () => {
    await api()
      .post(`/users/${ids.u1}/activate`)
      .set('Cookie', cookies.p2)
      .expect(404);
    await api()
      .post(`/users/${ids.u1}/reset-password`)
      .set('Cookie', cookies.p2)
      .expect(404);
    await api().get('/users').set('Cookie', cookies.p2).expect(200).expect([]);

    const own = await api().get('/users').set('Cookie', cookies.p1).expect(200);
    expect(own.body).toHaveLength(1);
    expect(own.body).toEqual([expect.objectContaining({ id: ids.u1 })]);
  });

  it('a participant cannot manage accounts; deactivation ends the session at once', async () => {
    await api()
      .post(`/users/${ids.u1}/activate`)
      .set('Cookie', cookies.p1)
      .expect(204);
    const u1 = await firstLogin('u1');
    await api().get('/users').set('Cookie', u1).expect(403);

    await api()
      .post(`/users/${ids.u1}/deactivate`)
      .set('Cookie', cookies.p1)
      .expect(204);
    await api().get('/auth/me').set('Cookie', u1).expect(401);
  });

  it('a password reset issues a new temporary password that must be changed', async () => {
    const res = await api()
      .post(`/users/${ids.u1}/reset-password`)
      .set('Cookie', cookies.p1)
      .expect(201);
    const { password } = res.body as { password: string };
    expect(password).not.toBe(temp.u1);

    await api()
      .post(`/users/${ids.u1}/activate`)
      .set('Cookie', cookies.p1)
      .expect(204);
    const u1 = await login('u1', password);
    await api()
      .get('/auth/me')
      .set('Cookie', u1)
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({ mustChangePassword: true }),
      );
    await api().get('/users').set('Cookie', u1).expect(403);
  });

  it('admin lists everyone except admins', async () => {
    const res = await api()
      .get('/users')
      .set('Cookie', cookies.admin)
      .expect(200);
    const usernames = (res.body as { username: string }[]).map(
      (u) => u.username,
    );
    expect(usernames).toEqual(
      expect.arrayContaining([prefix + 'p1', prefix + 'p2', prefix + 'u1']),
    );
    expect(usernames).not.toContain(prefix + 'admin');
  });
});
