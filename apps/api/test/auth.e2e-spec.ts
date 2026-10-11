import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs the whole login flow against a throwaway user, created and removed
// here so the seeded admin is never touched.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  const username = 'e2e-auth-user';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { username } });
    await prisma.user.create({
      data: {
        username,
        role: 'USER',
        active: true,
        mustChangePassword: true,
        passwordHash: await argon2.hash('temp-pass-1'),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username } });
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('rejects a malformed login body', () =>
    api()
      .post('/auth/login')
      .send({ username })
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' }),
      ));

  it('rejects a wrong password', () =>
    api()
      .post('/auth/login')
      .send({ username, password: 'wrong' })
      .expect(401)
      .expect({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      }));

  it('rejects requests without a session cookie', () =>
    api().get('/auth/me').expect(401));

  it('logs in, sets the session cookie, and returns the user', async () => {
    const res = await api()
      .post('/auth/login')
      .send({ username, password: 'temp-pass-1' })
      .expect(200);
    expect(res.body).toMatchObject({
      username,
      role: 'USER',
      mustChangePassword: true,
    });
    expect(res.body).not.toHaveProperty('passwordHash');

    const [setCookie] = res.get('Set-Cookie') ?? [];
    expect(setCookie).toMatch(/^sid=[^;]+;.*HttpOnly/);
    cookie = setCookie.split(';')[0];
  });

  it('returns the current user for a valid cookie', () =>
    api()
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ username })));

  it('rejects a wrong current password on change', () =>
    api()
      .post('/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'wrong', newPassword: 'brand-new-pass' })
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'WRONG_PASSWORD' }),
      ));

  it('changes the password and clears the must-change flag', async () => {
    await api()
      .post('/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'temp-pass-1', newPassword: 'brand-new-pass' })
      .expect(204);
    await api()
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) =>
        expect(res.body).toMatchObject({ mustChangePassword: false }),
      );
  });

  it('logs out and the cookie stops working', async () => {
    await api().post('/auth/logout').set('Cookie', cookie).expect(204);
    await api().get('/auth/me').set('Cookie', cookie).expect(401);
  });

  it('accepts the new password afterwards', () =>
    api()
      .post('/auth/login')
      .send({ username, password: 'brand-new-pass' })
      .expect(200));
});
