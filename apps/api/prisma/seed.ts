import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { baseModules, generalRules } from './base-modules';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

const adapter = new PrismaPg({ connectionString: requireEnv('DATABASE_URL') });
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
  const username = requireEnv('SEED_ADMIN_USERNAME');
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`admin "${username}" already exists, skipped`);
    return;
  }
  await prisma.user.create({
    data: {
      role: 'ADMIN',
      username,
      passwordHash: await argon2.hash(requireEnv('SEED_ADMIN_PASSWORD')),
      active: true,
      mustChangePassword: true,
    },
  });
  console.log(`admin "${username}" created`);
}

async function seedBaseModules() {
  for (const data of baseModules) {
    const existing = await prisma.module.findFirst({
      where: { isBase: true, order: data.order },
    });
    if (existing) continue;
    await prisma.module.create({ data: { ...data, isBase: true } });
    console.log(`module ${data.order} created`);
  }
}

async function seedGeneralRules() {
  const slug = 'general-rules';
  const existing = await prisma.contentPage.findUnique({ where: { slug } });
  if (existing) return;
  await prisma.contentPage.create({ data: { slug, content: generalRules } });
  console.log('general-rules page created');
}

async function main() {
  await seedAdmin();
  await seedBaseModules();
  await seedGeneralRules();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
