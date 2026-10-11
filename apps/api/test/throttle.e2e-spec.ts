import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { LOGIN_RATE_LIMIT } from '../src/auth/auth.constants';

// Own app instance so the attempt counter starts at zero.
describe('Login rate limit (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('answers 429 after too many login attempts from one ip', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nobody', password: 'wrong' });

    for (let i = 0; i < LOGIN_RATE_LIMIT.limit; i++) {
      await attempt().expect(401);
    }
    await attempt()
      .expect(429)
      .expect((res) =>
        expect(res.body).toMatchObject({ code: 'TOO_MANY_REQUESTS' }),
      );
  });
});
