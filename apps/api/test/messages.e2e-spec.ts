import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
};
type InboxRow = { id: string; username: string; unread: number };

// p1 has u1 and u2, p2 has u3. Five logins.
describe('Messages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const prefix = 'e2e-messages-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  const api = () => request(app.getHttpServer());
  const send = (cookie: string, body: object) =>
    api().post('/messages').set('Cookie', cookie).send(body);

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
    await prisma.message.deleteMany({
      where: { OR: [{ sender: byPrefix }, { recipient: byPrefix }] },
    });
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
      owner?: string,
    ) => {
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
    };
    await account('admin', 'ADMIN');
    await account('p1', 'PSYCHOLOGIST');
    await account('p2', 'PSYCHOLOGIST');
    await account('u1', 'USER', 'p1');
    await account('u2', 'USER', 'p1');
    await account('u3', 'USER', 'p2');
    for (const name of ['admin', 'p1', 'p2', 'u1', 'u3'])
      cookies[name] = await login(name);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('a participant writes only to their own psychologist', async () => {
    const res = await send(cookies.u1, { body: 'Bugün zor bir gündü.' }).expect(
      201,
    );
    expect(res.body).toMatchObject({
      senderId: ids.u1,
      recipientId: ids.p1,
      readAt: null,
    });
    ids.fromU1 = (res.body as Message).id;

    await send(cookies.u1, { recipientId: ids.p2, body: 'x' }).expect(404);
    await send(cookies.u1, { body: '  ' }).expect(400);
    await send(cookies.admin, { recipientId: ids.u1, body: 'x' }).expect(403);
  });

  it('the inbox shows own participants with unread counts', async () => {
    const p1 = await api()
      .get('/messages')
      .set('Cookie', cookies.p1)
      .expect(200);
    expect(p1.body as InboxRow[]).toEqual([
      expect.objectContaining({ id: ids.u1, unread: 1 }),
      expect.objectContaining({ id: ids.u2, unread: 0 }),
    ]);
    const p2 = await api()
      .get('/messages')
      .set('Cookie', cookies.p2)
      .expect(200);
    expect(p2.body as InboxRow[]).toEqual([
      expect.objectContaining({ id: ids.u3, unread: 0 }),
    ]);
  });

  it('a psychologist reads and answers only own participants', async () => {
    const thread = await api()
      .get(`/messages/${ids.u1}`)
      .set('Cookie', cookies.p1)
      .expect(200);
    expect(thread.body as Message[]).toHaveLength(1);
    await api()
      .get(`/messages/${ids.u3}`)
      .set('Cookie', cookies.p1)
      .expect(404);
    await api()
      .get(`/messages/${ids.p1}`)
      .set('Cookie', cookies.u1)
      .expect(403);

    await send(cookies.p1, { body: 'x' })
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'RECIPIENT_REQUIRED' }),
      );
    await send(cookies.p1, { recipientId: ids.u3, body: 'x' }).expect(404);
    const reply = await send(cookies.p1, {
      recipientId: ids.u1,
      body: 'Yanındayım, yarın konuşalım.',
    }).expect(201);
    ids.fromP1 = (reply.body as Message).id;
  });

  it('a participant sees the whole thread, oldest first; others see nothing', async () => {
    const mine = await api()
      .get('/messages')
      .set('Cookie', cookies.u1)
      .expect(200);
    expect((mine.body as Message[]).map((m) => m.id)).toEqual([
      ids.fromU1,
      ids.fromP1,
    ]);
    await api()
      .get('/messages')
      .set('Cookie', cookies.u3)
      .expect(200)
      .expect([]);
  });

  it('only the recipient marks a message read, once', async () => {
    const read = (cookie: string, id: string) =>
      api().patch(`/messages/${id}/read`).set('Cookie', cookie);
    await read(cookies.u1, ids.fromU1).expect(404);
    await read(cookies.u1, ids.fromP1).expect(204);
    await read(cookies.u1, ids.fromP1).expect(404);
    await read(cookies.p1, ids.fromU1).expect(204);

    const inbox = await api()
      .get('/messages')
      .set('Cookie', cookies.p1)
      .expect(200);
    expect(inbox.body as InboxRow[]).toEqual([
      expect.objectContaining({ id: ids.u1, unread: 0 }),
      expect.objectContaining({ id: ids.u2, unread: 0 }),
    ]);
  });
});
