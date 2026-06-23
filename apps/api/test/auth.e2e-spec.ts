/**
 * Auth e2e smoke test — HTTP-smoke variant.
 *
 * Why not in-process (Test.createTestingModule)?
 * @repo/database is published as ESM ("type":"module") and its dist files
 * use ESM `import` statements.  Jest runs a CJS module runtime that cannot
 * natively execute those files, and the Node 22 `require(esm)` bridge is not
 * available inside Jest's custom module resolver.  Making ts-jest transform
 * the package's TypeScript source is equally blocked because the source uses
 * NodeNext `.js` extension imports that ts-jest (in CJS mode) cannot resolve.
 *
 * Solution: spawn the already-built server (`apps/api/dist/main.js`) as a
 * real child process, wait for it to be healthy, run the same assertions via
 * fetch against http://localhost:3001, then kill the process.  This sidesteps
 * the Jest ESM boundary entirely while still verifying the full auth + guard +
 * Prisma + response-envelope stack end-to-end.
 */
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';

const BASE_URL = 'http://localhost:3001';
const HEALTH_URL = `${BASE_URL}/api/v1/health`;
const SERVER_STARTUP_TIMEOUT_MS = 20_000;
const SERVER_POLL_INTERVAL_MS = 200;

async function waitForServer(
  url: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not yet ready
    }
    await new Promise((r) => setTimeout(r, SERVER_POLL_INTERVAL_MS));
  }
  throw new Error(
    `Server did not become ready at ${url} within ${timeoutMs}ms`,
  );
}

describe('Auth (e2e)', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    const distMain = path.resolve(__dirname, '../dist/main.js');

    serverProcess = spawn(process.execPath, [distMain], {
      env: { ...process.env },
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    serverProcess.stdout?.on('data', () => {
      // suppress output during tests
    });
    serverProcess.stderr?.on('data', () => {
      // suppress output during tests
    });

    await waitForServer(HEALTH_URL, SERVER_STARTUP_TIMEOUT_MS);
  }, SERVER_STARTUP_TIMEOUT_MS + 5_000);

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        serverProcess.once('exit', () => resolve());
        setTimeout(() => {
          if (!serverProcess.killed) serverProcess.kill('SIGKILL');
          resolve();
        }, 5_000);
      });
    }
  });

  it('GET /api/v1/health → 200', async () => {
    const res = await fetch(HEALTH_URL);
    expect(res.status).toBe(200);
  });

  it('logs in a seeded user and returns the current user from /me', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lisa.visser@bydeusz.com',
        password: 'Admin123!',
      }),
    });
    expect(loginRes.status).toBe(200);

    const loginBody = (await loginRes.json()) as {
      data: { access_token: string };
    };
    const accessToken = loginBody.data.access_token;
    expect(typeof accessToken).toBe('string');

    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status).toBe(200);

    const meBody = (await meRes.json()) as { data: { email: string } };
    expect(meBody.data.email).toBe('lisa.visser@bydeusz.com');
  });

  it('rejects /me without a token → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`);
    expect(res.status).toBe(401);
  });
});
