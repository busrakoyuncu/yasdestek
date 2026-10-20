import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

// Real object storage (Garage). One psychologist with a group of two (u1 uploads, u2 is the
// group mate), one participant in another group (u3), a second psychologist,
// and an admin. Six logins.
describe('Files (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: StorageService;
  const prefix = 'e2e-files-';
  const ids: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  const api = () => request(app.getHttpServer());

  async function login(name: string) {
    const res = await api()
      .post('/auth/login')
      .send({ username: prefix + name, password: 'pass-' + name })
      .expect(200);
    const [setCookie] = res.get('Set-Cookie') ?? [];
    return setCookie.split(';')[0];
  }

  const upload = (
    cookie: string,
    moduleId: string,
    type = 'image/png',
    data = png,
  ) =>
    api()
      .post('/files')
      .set('Cookie', cookie)
      .field('moduleId', moduleId)
      .attach('file', data, { filename: 'f', contentType: type });

  async function cleanup() {
    const byPrefix = { username: { startsWith: prefix } };
    const files = await prisma.mediaFile.findMany({
      where: { uploader: byPrefix },
      select: { storageKey: true },
    });
    for (const { storageKey } of files) await storage.remove(storageKey);
    await prisma.mediaFile.deleteMany({ where: { uploader: byPrefix } });
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
    await account('p2', 'PSYCHOLOGIST');
    const g1 = await prisma.group.create({
      data: { name: 'G1', psychologistId: ids.p1 },
    });
    const g2 = await prisma.group.create({
      data: { name: 'G2', psychologistId: ids.p1 },
    });
    await account('u1', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u2', 'USER', { psychologistId: ids.p1, groupId: g1.id });
    await account('u3', 'USER', { psychologistId: ids.p1, groupId: g2.id });
    const module = await prisma.module.create({
      data: {
        title: 'Bağları Sürdürme (test)',
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

    for (const name of ['admin', 'p1', 'p2', 'u1', 'u2', 'u3']) {
      cookies[name] = await login(name);
    }
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('a participant uploads to an assigned module, creating the draft if needed', async () => {
    const res = await upload(cookies.u1, ids.module).expect(201);
    expect(res.body).toMatchObject({
      mimeType: 'image/png',
      size: png.length,
      uploaderId: ids.u1,
    });
    expect(res.body).not.toHaveProperty('storageKey');
    ids.file = (res.body as { id: string }).id;

    const mine = await api()
      .get(`/modules/${ids.module}/response`)
      .set('Cookie', cookies.u1)
      .expect(200);
    expect(mine.body).toMatchObject({
      published: false,
      files: [{ id: ids.file, mimeType: 'image/png' }],
    });
  });

  it('rejects wrong types, oversized images, unassigned modules, and non-participants', async () => {
    await upload(cookies.u1, ids.module, 'text/plain')
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' }),
      );
    await upload(
      cookies.u1,
      ids.module,
      'image/png',
      Buffer.alloc(10 * 1024 * 1024 + 1),
    )
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'FILE_TOO_LARGE' }),
      );
    await upload(cookies.u1, ids.unassigned).expect(404);
    await upload(cookies.p1, ids.module).expect(403);
    await api()
      .post('/files')
      .set('Cookie', cookies.u1)
      .field('moduleId', ids.module)
      .expect(400)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'FILE_REQUIRED' }),
      );
  });

  it('streams the file back to the uploader with the right headers', async () => {
    const res = await api()
      .get(`/files/${ids.file}`)
      .set('Cookie', cookies.u1)
      .buffer()
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe(String(png.length));
    expect(Buffer.compare(res.body as Buffer, png)).toBe(0);
  });

  it('serves byte ranges with 206', async () => {
    const res = await api()
      .get(`/files/${ids.file}`)
      .set('Cookie', cookies.u1)
      .set('Range', 'bytes=2-5')
      .buffer()
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(206);
    expect(res.headers['content-range']).toBe(`bytes 2-5/${png.length}`);
    expect(res.headers['content-length']).toBe('4');
    expect(Buffer.compare(res.body as Buffer, png.subarray(2, 6))).toBe(0);

    await api()
      .get(`/files/${ids.file}`)
      .set('Cookie', cookies.u1)
      .set('Range', 'bytes=999-')
      .expect(416);
  });

  it('group mates see the file only once the response is published', async () => {
    const get = (cookie: string) =>
      api().get(`/files/${ids.file}`).set('Cookie', cookie);
    await get(cookies.u2).expect(404);
    await get(cookies.p1).expect(200);
    await get(cookies.admin).expect(200);

    await api()
      .put(`/modules/${ids.module}/response`)
      .set('Cookie', cookies.u1)
      .send({ text: 'Bu fotoğraf...', published: true })
      .expect(200);

    await get(cookies.u2).expect(200);
    await get(cookies.u3).expect(404);
    await get(cookies.p2).expect(404);
  });

  it('only the uploader deletes; the object goes with the row', async () => {
    await api()
      .delete(`/files/${ids.file}`)
      .set('Cookie', cookies.u2)
      .expect(404);
    await api()
      .delete(`/files/${ids.file}`)
      .set('Cookie', cookies.p1)
      .expect(403);
    await api()
      .delete(`/files/${ids.file}`)
      .set('Cookie', cookies.u1)
      .expect(204);
    await api().get(`/files/${ids.file}`).set('Cookie', cookies.u1).expect(404);
    await expect(
      prisma.mediaFile.count({ where: { uploaderId: ids.u1 } }),
    ).resolves.toBe(0);
  });
});
