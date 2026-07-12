import 'dotenv/config';
import * as readline from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedSuperAdmin } from '../src/seed-super-admin.js';

const MIN_PASSWORD_LENGTH = 8;

// Control keys, by char code (avoids embedding raw control characters).
const CTRL_C = 3;
const CTRL_D = 4;
const BACKSPACE = 8;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const DELETE = 127;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

interface Credentials {
  email: string;
  password: string;
}

/**
 * Read a single line from a raw TTY, echoing typed characters (or masking them
 * with `*` for secrets). Node's readline does not hide input, so we drive the
 * terminal ourselves — this is what makes the password prompt behave like a
 * normal CLI password field.
 */
function readFromTty(query: string, { mask = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char: string): void => {
      const code = char.charCodeAt(0);

      if (code === CARRIAGE_RETURN || code === LINE_FEED || code === CTRL_D) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }

      if (code === CTRL_C) {
        stdin.setRawMode(false);
        process.stdout.write('\n');
        process.exit(130);
      }

      if (code === BACKSPACE || code === DELETE) {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      input += char;
      process.stdout.write(mask ? '*'.repeat(char.length) : char);
    };
    stdin.on('data', onData);
  });
}

async function promptInteractive(): Promise<Credentials> {
  process.stdout.write('Create a platform super admin.\n\n');
  const email = (await readFromTty('Email: ')).trim();

  for (;;) {
    const password = await readFromTty('Password: ', { mask: true });
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`  Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      continue;
    }
    const confirm = await readFromTty('Confirm password: ', { mask: true });
    if (password !== confirm) {
      console.error('  Passwords do not match. Try again.');
      continue;
    }
    return { email, password };
  }
}

/**
 * Non-TTY fallback (piped stdin / CI): read the email and password as the first
 * two lines. Keeps the command scriptable, e.g. `printf 'a@b.com\npw\n' | ...`.
 */
async function readFromPipe(): Promise<Credentials> {
  const rl = readline.createInterface({ input: process.stdin });
  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }
  rl.close();

  const [email, password] = lines;
  if (!email || !password) {
    throw new Error(
      'Expected an email and password (two lines) on stdin, or set SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.',
    );
  }
  return { email: email.trim(), password };
}

async function resolveCredentials(): Promise<Credentials> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (email && password) {
    return { email, password };
  }
  return process.stdin.isTTY ? promptInteractive() : readFromPipe();
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const credentials = await resolveCredentials();
  const admin = await seedSuperAdmin(prisma, credentials);
  console.log(`\n✔ Super admin ready: ${admin.email} (${admin.role})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(
      '\nCould not create super admin:',
      error instanceof Error ? error.message : error,
    );
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
