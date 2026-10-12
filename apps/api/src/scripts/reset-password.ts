import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { generatePassword } from '../common/password';
import { PrismaClient } from '../generated/prisma/client';

// Server-side recovery for when nobody above can reset a password, such as a
// lost admin password. Prints a temporary password once and ends all sessions.
//   dev:  pnpm --filter api reset-password <username>
//   prod: node dist/scripts/reset-password.js <username>
async function main() {
  const username = process.argv[2];
  if (!username) throw new Error('Usage: reset-password <username>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const password = generatePassword();
    const passwordHash = await argon2.hash(password);
    const [{ count }] = await prisma.$transaction([
      prisma.user.updateMany({
        where: { username },
        data: { passwordHash, mustChangePassword: true },
      }),
      prisma.session.deleteMany({ where: { user: { username } } }),
    ]);
    if (count === 0) throw new Error(`No user named "${username}"`);
    console.log(`Temporary password for ${username}: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
