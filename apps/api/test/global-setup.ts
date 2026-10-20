import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';

// Runs once before the e2e suite. Points every worker at a throwaway
// database named after the dev one with a _test suffix, recreates it,
// applies the migrations, and seeds it. Dev data is never touched.
export default async function globalSetup() {
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error('DATABASE_URL is not set');

  const url = new URL(devUrl);
  const name = `${url.pathname.slice(1)}_test`;
  await recreateDatabase(devUrl, name);

  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();
  const prisma = resolve(__dirname, '../node_modules/.bin/prisma');
  execFileSync(prisma, ['migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  execFileSync(prisma, ['db', 'seed'], { env: process.env, stdio: 'pipe' });
}

// Only ever drops a database whose name ends in _test.
async function recreateDatabase(adminUrl: string, name: string) {
  if (!name.endsWith('_test')) throw new Error(`Refusing to drop "${name}"`);
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(`drop database if exists "${name}" with (force)`);
    await client.query(`create database "${name}"`);
  } finally {
    await client.end();
  }
}
