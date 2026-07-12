// Auth e2e smoke test — spawns the built server (`dist/main.js`) against
// real Postgres + Redis containers (started by globalSetup/e2e.js) and
// runs HTTP assertions via fetch.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { openSync, readFileSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ?? "3001";
const BASE_URL = `http://localhost:${PORT}`;
const HEALTH_URL = `${BASE_URL}/api/v1/health`;
// Generous margin: the server connects to 3 containers (pg/redis/minio) on
// boot, which can be slow under CI/container contention.
const SERVER_STARTUP_TIMEOUT_MS = 40_000;
const SERVER_POLL_INTERVAL_MS = 200;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
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

const logPath = join(tmpdir(), "api-e2e-server.log");
const logFd = openSync(logPath, "w");

describe("Auth (e2e)", () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    const distMain = resolve(here, "../dist/main.js");

    serverProcess = spawn(process.execPath, [distMain], {
      env: { ...process.env },
      cwd: resolve(here, ".."),
      // Use a file fd for stdout/stderr — avoids pipe-buffer backpressure from
      // NestJS's verbose JSON log output while preserving logs for diagnostics.
      stdio: ["ignore", logFd, logFd],
    });

    try {
      await waitForServer(HEALTH_URL, SERVER_STARTUP_TIMEOUT_MS);
    } catch (err) {
      let serverLog = "";
      try {
        serverLog = readFileSync(logPath, "utf8");
      } catch {
        // ignore read errors
      }
      throw new Error(
        `${(err as Error).message}\n\n--- Server log (${logPath}) ---\n${serverLog || "(empty)"}`,
      );
    }
  }, SERVER_STARTUP_TIMEOUT_MS + 5_000);

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        serverProcess.once("exit", () => resolve());
        setTimeout(() => {
          if (!serverProcess.killed) serverProcess.kill("SIGKILL");
          resolve();
        }, 5_000);
      });
    }
    try {
      closeSync(logFd);
    } catch {
      // ignore
    }
  });

  it("GET /api/v1/health → 200", async () => {
    const res = await fetch(HEALTH_URL);
    expect(res.status).toBe(200);
  });

  it("logs in a seeded user and returns the current user from /me", async () => {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "lisa.visser@bydeusz.com",
        password: "Admin123!",
      }),
    });
    expect(loginRes.status).toBe(200);

    const loginBody = (await loginRes.json()) as {
      data: { access_token: string };
    };
    const accessToken = loginBody.data.access_token;
    expect(typeof accessToken).toBe("string");

    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status).toBe(200);

    const meBody = (await meRes.json()) as {
      data: { email: string; role: string };
    };
    expect(meBody.data.email).toBe("lisa.visser@bydeusz.com");
    // The role is exposed through /me so the dashboard can gate on SUPER_ADMIN.
    expect(meBody.data.role).toBe("USER");
  });

  it("logs in the seeded super admin and /me reports SUPER_ADMIN", async () => {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin@bydeusz.com",
        password: "Admin123!",
      }),
    });
    expect(loginRes.status).toBe(200);

    const loginBody = (await loginRes.json()) as {
      data: { access_token: string };
    };

    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.data.access_token}` },
    });
    expect(meRes.status).toBe(200);

    const meBody = (await meRes.json()) as {
      data: { email: string; role: string };
    };
    expect(meBody.data.email).toBe("superadmin@bydeusz.com");
    expect(meBody.data.role).toBe("SUPER_ADMIN");
  });

  it("rejects /me without a token → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`);
    expect(res.status).toBe(401);
  });
});
