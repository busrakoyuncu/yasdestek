import { randomInt } from 'node:crypto';

// No 0/O or 1/l/I, so a password read out loud or copied by hand is unambiguous.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Temporary password for new accounts and resets. Shown once, then only its hash is kept.
export function generatePassword(length = 12): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}
