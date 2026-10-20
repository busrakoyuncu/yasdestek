import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // One reverse proxy (Caddy) in front: read the client ip from X-Forwarded-For.
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
