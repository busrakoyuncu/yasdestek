import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

// The socket channel on a real port with a real Socket.IO client, as a
// browser would use it. p1 has u1, u2, u4 and u5; p2 has u3. The login
// route allows 10 attempts a minute, so this file logs in 9 times.
describe('Realtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let url: string;
  const prefix = 'e2e-realtime-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  const sockets: Socket[] = [];

  const api = () => request(app.getHttpServer());

  async function login(name: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password: 'Pass-' + name })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  // Resolves once connected; rejects with the server's reason if refused.
  function connect(cookie?: string) {
    return new Promise<Socket>((resolve, reject) => {
      const socket = io(url, {
        transports: ['websocket'],
        extraHeaders: cookie ? { cookie } : {},
        reconnection: false,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', (error) => {
        socket.close();
        reject(error);
      });
    });
  }

  // Counts the "messages" doorbells a socket hears.
  function heard(socket: Socket) {
    const log = { count: 0 };
    socket.on('messages', () => log.count++);
    return log;
  }

  const closed = (socket: Socket) =>
    new Promise<string>((done) => socket.once('disconnect', done));

  async function cleanup() {
    const byPrefix = { username: { startsWith: prefix } };
    await prisma.message.deleteMany({
      where: { OR: [{ sender: byPrefix }, { recipient: byPrefix }] },
    });
    for (const role of ['USER', 'PSYCHOLOGIST'] as const) {
      await prisma.user.deleteMany({ where: { role, ...byPrefix } });
    }
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    // A real port: the socket client needs one, supertest does not.
    await app.listen(0);
    const server = app.getHttpServer() as unknown as Server;
    const { port } = server.address() as AddressInfo;
    url = `http://localhost:${port}`;
    prisma = app.get(PrismaService);
    await cleanup();

    const account = async (
      name: string,
      role: 'PSYCHOLOGIST' | 'USER',
      owner?: string,
      mustChangePassword = false,
    ) => {
      const user = await prisma.user.create({
        data: {
          username: prefix + name,
          role,
          active: true,
          mustChangePassword,
          passwordHash: await argon2.hash('Pass-' + name),
          psychologistId: owner ? ids[owner] : null,
        },
      });
      ids[name] = user.id;
    };
    await account('p1', 'PSYCHOLOGIST');
    await account('p2', 'PSYCHOLOGIST');
    await account('u1', 'USER', 'p1');
    await account('u2', 'USER', 'p1');
    await account('u3', 'USER', 'p2');
    await account('u4', 'USER', 'p1');
    await account('u5', 'USER', 'p1', true);
    for (const name of ['p1', 'p2', 'u1', 'u2', 'u3', 'u4', 'u5'])
      cookies[name] = await login(name);
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.close());
    await cleanup();
    await app.close();
  });

  it('refuses a handshake without a valid session', async () => {
    await expect(connect()).rejects.toThrow('UNAUTHORIZED');
    await expect(
      connect('sid=00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('UNAUTHORIZED');
    // must change the temporary password first, as on the REST api
    await expect(connect(cookies.u5)).rejects.toThrow('UNAUTHORIZED');
  });

  it('rings both sides of a new message and nobody else', async () => {
    const [p1, p2, u1, u3] = await Promise.all(
      [cookies.p1, cookies.p2, cookies.u1, cookies.u3].map(connect),
    );
    const logs = { p1: heard(p1), p2: heard(p2), u1: heard(u1), u3: heard(u3) };

    const arrived = new Promise((done) => p1.once('messages', done));
    await api()
      .post('/messages')
      .set('Cookie', cookies.u1)
      .send({ body: 'Bugün zor bir gündü.' })
      .expect(201);
    await arrived;
    // give a stray event time to show up before checking it did not
    await sleep(100);

    expect(logs.p1.count).toBe(1);
    expect(logs.u1.count).toBe(1);
    // another counselor and another counselor's participant hear nothing
    expect(logs.p2.count).toBe(0);
    expect(logs.u3.count).toBe(0);
  });

  it('logout closes only the sockets of that login', async () => {
    const other = await login('u1');
    const stays = await connect(cookies.u1);
    const goes = await connect(other);

    const reason = closed(goes);
    await api().post('/auth/logout').set('Cookie', other).expect(204);
    expect(await reason).toBe('io server disconnect');
    await sleep(100);
    expect(stays.connected).toBe(true);
  });

  it('deactivation closes every socket of the user', async () => {
    const tabs = await Promise.all([connect(cookies.u2), connect(cookies.u2)]);
    const reasons = Promise.all(tabs.map(closed));
    await api()
      .post(`/users/${ids.u2}/deactivate`)
      .set('Cookie', cookies.p1)
      .expect(204);
    expect(await reasons).toEqual([
      'io server disconnect',
      'io server disconnect',
    ]);
    // the session is gone, so the next handshake is refused
    await expect(connect(cookies.u2)).rejects.toThrow('UNAUTHORIZED');
  });

  it('a password change keeps this login and closes the others', async () => {
    const other = await login('u4');
    const here = await connect(cookies.u4);
    const elsewhere = await connect(other);

    const reason = closed(elsewhere);
    await api()
      .post('/auth/change-password')
      .set('Cookie', cookies.u4)
      .send({ currentPassword: 'Pass-u4', newPassword: 'Brand-new-pass' })
      .expect(204);
    expect(await reason).toBe('io server disconnect');
    await sleep(100);
    expect(here.connected).toBe(true);
  });
});
