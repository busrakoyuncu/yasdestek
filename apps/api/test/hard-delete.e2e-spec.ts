import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

// u1 writes, uploads, comments, and messages; then an admin erases u1.
// Real object storage (Garage). Four logins.
describe('Hard delete (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: StorageService;
  const prefix = 'e2e-harddelete-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  const png = Buffer.from('89504e470d0a1a0a', 'hex');

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
    const files = await prisma.mediaFile.findMany({
      where: { uploader: byPrefix },
      select: { storageKey: true },
    });
    for (const { storageKey } of files)
      await storage.remove(storageKey).catch(() => undefined);
    await prisma.mediaFile.deleteMany({ where: { uploader: byPrefix } });
    await prisma.comment.deleteMany({ where: { author: byPrefix } });
    await prisma.response.deleteMany({ where: { user: byPrefix } });
    await prisma.message.deleteMany({
      where: { OR: [{ sender: byPrefix }, { recipient: byPrefix }] },
    });
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
    storage = app.get(StorageService);
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
      data: { name: 'G1', psychologistId: ids.p1 },
    });
    await account('u1', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u2', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    const module = await prisma.module.create({
      data: {
        title: 'M',
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
    for (const name of ['admin', 'p1', 'u1', 'u2'])
      cookies[name] = await login(name);

    // u1's footprint: a published response with a file, comments both ways, messages both ways.
    const save = (cookie: string) =>
      api()
        .put(`/modules/${ids.module}/response`)
        .set('Cookie', cookie)
        .send({ text: 'x', published: true })
        .expect(200);
    ids.postU1 = ((await save(cookies.u1)).body as { id: string }).id;
    ids.postU2 = ((await save(cookies.u2)).body as { id: string }).id;
    const upload = await api()
      .post('/files')
      .set('Cookie', cookies.u1)
      .field('moduleId', ids.module)
      .attach('file', png, { filename: 'f', contentType: 'image/png' })
      .expect(201);
    ids.file = (upload.body as { id: string }).id;
    await api()
      .post(`/responses/${ids.postU1}/comments`)
      .set('Cookie', cookies.u2)
      .send({ text: 'on u1' })
      .expect(201);
    await api()
      .post(`/responses/${ids.postU2}/comments`)
      .set('Cookie', cookies.u1)
      .send({ text: 'by u1' })
      .expect(201);
    await api()
      .post('/messages')
      .set('Cookie', cookies.u1)
      .send({ body: 'hi' })
      .expect(201);
    await api()
      .post('/messages')
      .set('Cookie', cookies.p1)
      .send({ recipientId: ids.u1, body: 'hello' })
      .expect(201);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('is admin only and participants only', async () => {
    await api()
      .delete(`/users/${ids.u1}`)
      .set('Cookie', cookies.p1)
      .expect(403);
    await api()
      .delete(`/users/${ids.p1}`)
      .set('Cookie', cookies.admin)
      .expect(404);
  });

  it('erases the participant, everything they wrote, and their objects', async () => {
    await api()
      .delete(`/users/${ids.u1}`)
      .set('Cookie', cookies.admin)
      .expect(204);

    await expect(
      prisma.user.findUnique({ where: { id: ids.u1 } }),
    ).resolves.toBeNull();
    await expect(
      prisma.response.count({ where: { userId: ids.u1 } }),
    ).resolves.toBe(0);
    await expect(
      prisma.mediaFile.count({ where: { uploaderId: ids.u1 } }),
    ).resolves.toBe(0);
    await expect(
      prisma.comment.count({
        where: { OR: [{ authorId: ids.u1 }, { responseId: ids.postU1 }] },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.message.count({
        where: { OR: [{ senderId: ids.u1 }, { recipientId: ids.u1 }] },
      }),
    ).resolves.toBe(0);

    // u2's own post survives, only u1's comment under it is gone.
    await expect(
      prisma.response.count({ where: { id: ids.postU2 } }),
    ).resolves.toBe(1);
    await expect(
      prisma.comment.count({ where: { responseId: ids.postU2 } }),
    ).resolves.toBe(0);

    await api().get(`/files/${ids.file}`).set('Cookie', cookies.p1).expect(404);
    await api().get('/auth/me').set('Cookie', cookies.u1).expect(401);
    await expect(
      storage.get(`responses/${ids.postU1}/anything`),
    ).rejects.toBeDefined();
  });
});
