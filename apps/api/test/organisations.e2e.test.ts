import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { openSync, readFileSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? "3001";
const BASE = `http://localhost:${PORT}/api/v1`;
const HEALTH_URL = `${BASE}/health`;
const SERVER_STARTUP_TIMEOUT_MS = 40_000;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
}

const tokenCache = new Map<string, string>();

async function login(email: string): Promise<string> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Admin123!" }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: { access_token: string } };
  tokenCache.set(email, body.data.access_token);
  return body.data.access_token;
}

function authHeaders(token: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

const logPath = `${tmpdir()}/api-org-e2e-server.log`;
const logFd = openSync(logPath, "w");

describe("Organisations (e2e)", () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    const distMain = resolve(here, "../dist/main.js");
    serverProcess = spawn(process.execPath, [distMain], {
      env: { ...process.env },
      cwd: resolve(here, ".."),
      stdio: ["ignore", logFd, logFd],
    });
    try {
      await waitForServer(HEALTH_URL, SERVER_STARTUP_TIMEOUT_MS);
    } catch (err) {
      let serverLog = "";
      try {
        serverLog = readFileSync(logPath, "utf8");
      } catch {
        // ignore
      }
      throw new Error(`${(err as Error).message}\n--- log ---\n${serverLog}`);
    }
  }, SERVER_STARTUP_TIMEOUT_MS + 5_000);

  afterAll(async () => {
    if (serverProcess && serverProcess.exitCode === null && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await new Promise<void>((r) => {
        serverProcess.once("exit", () => r());
        setTimeout(() => {
          if (!serverProcess.killed) serverProcess.kill("SIGKILL");
          r();
        }, 5_000);
      });
    }
    try {
      closeSync(logFd);
    } catch {
      // ignore
    }
  });

  it("creates an organisation and makes the creator an ADMIN", async () => {
    const token = await login("john.doe@example.com");
    const res = await fetch(`${BASE}/organisations`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Acme BV" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { id: string; role: string; memberCount: number };
    };
    expect(body.data.role).toBe("ADMIN");
    expect(body.data.memberCount).toBe(1);
  });

  it("enforces admin-only updates and tenant isolation", async () => {
    const adminToken = await login("john.doe@example.com");
    const memberToken = await login("lisa.visser@example.com");

    const createRes = await fetch(`${BASE}/organisations`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Isolation Co" }),
    });
    const orgId = ((await createRes.json()) as { data: { id: string } }).data.id;

    const outsiderGet = await fetch(`${BASE}/organisations/${orgId}`, {
      headers: authHeaders(memberToken),
    });
    expect(outsiderGet.status).toBe(404);

    const addRes = await fetch(`${BASE}/organisations/${orgId}/members`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ email: "lisa.visser@example.com" }),
    });
    expect(addRes.status).toBe(201);

    const memberGet = await fetch(`${BASE}/organisations/${orgId}`, {
      headers: authHeaders(memberToken),
    });
    expect(memberGet.status).toBe(200);

    const memberPatch = await fetch(`${BASE}/organisations/${orgId}`, {
      method: "PATCH",
      headers: authHeaders(memberToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Hacked" }),
    });
    expect(memberPatch.status).toBe(403);

    const dupAdd = await fetch(`${BASE}/organisations/${orgId}/members`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ email: "lisa.visser@example.com" }),
    });
    expect(dupAdd.status).toBe(409);
  });

  it("invites a brand-new account and blocks its login until reset", async () => {
    const adminToken = await login("john.doe@example.com");
    const createRes = await fetch(`${BASE}/organisations`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Invite Co" }),
    });
    const orgId = ((await createRes.json()) as { data: { id: string } }).data.id;

    const invitee = `invitee-${Date.now()}@example.com`;
    const addRes = await fetch(`${BASE}/organisations/${orgId}/members`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ email: invitee, name: "New", surname: "Invitee" }),
    });
    expect(addRes.status).toBe(201);
    const added = (await addRes.json()) as {
      data: { email: string; role: string };
    };
    expect(added.data.email).toBe(invitee);
    expect(added.data.role).toBe("MEMBER");

    const reAdd = await fetch(`${BASE}/organisations/${orgId}/members`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ email: invitee }),
    });
    expect(reAdd.status).toBe(409);

    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invitee, password: "whatever" }),
    });
    expect(loginRes.status).toBe(401);
  });

  it("protects the last admin and allows promotion", async () => {
    const adminToken = await login("john.doe@example.com");
    const createRes = await fetch(`${BASE}/organisations`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: "Succession Co" }),
    });
    const org = (await createRes.json()) as { data: { id: string } };
    const orgId = org.data.id;

    const meRes = await fetch(`${BASE}/auth/me`, {
      headers: authHeaders(adminToken),
    });
    const johnId = ((await meRes.json()) as { data: { id: string } }).data.id;

    const selfRemove = await fetch(
      `${BASE}/organisations/${orgId}/members/${johnId}`,
      { method: "DELETE", headers: authHeaders(adminToken) },
    );
    expect(selfRemove.status).toBe(409);

    const addLisa = await fetch(`${BASE}/organisations/${orgId}/members`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ email: "lisa.visser@example.com" }),
    });
    expect(addLisa.status).toBe(201);
    const lisaToken = await login("lisa.visser@example.com");
    const lisaMe = await fetch(`${BASE}/auth/me`, {
      headers: authHeaders(lisaToken),
    });
    const lisaId = ((await lisaMe.json()) as { data: { id: string } }).data.id;

    const promote = await fetch(
      `${BASE}/organisations/${orgId}/members/${lisaId}`,
      {
        method: "PATCH",
        headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ role: "ADMIN" }),
      },
    );
    expect(promote.status).toBe(200);
    const promoted = (await promote.json()) as { data: { role: string } };
    expect(promoted.data.role).toBe("ADMIN");

    const removeJohn = await fetch(
      `${BASE}/organisations/${orgId}/members/${johnId}`,
      { method: "DELETE", headers: authHeaders(lisaToken) },
    );
    expect(removeJohn.status).toBe(204);
  });
});
