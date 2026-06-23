import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;
const PASSWORD_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generatePassword(length = 16): string {
  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARSET[bytes[i] % PASSWORD_CHARSET.length];
  }

  return password;
}
