import { describe, it, expect, vi, afterEach } from "vitest";
import { loginHandler, refreshHandler, logoutHandler } from "./server";

afterEach(() => vi.restoreAllMocks());

function jsonRequest(url: string, body: unknown, cookie?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function backendResponse(ok: boolean, body: unknown, status = ok ? 200 : 400): Response {
  return { ok, status, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe("loginHandler", () => {
  it("returns the access token and sets an httpOnly refresh cookie on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        backendResponse(true, {
          success: true,
          data: { access_token: "access-1", refresh_token: "refresh-1" },
        }),
      ),
    );

    const res = await loginHandler(
      jsonRequest("http://localhost/api/auth/login", { email: "a@b.c", password: "pw" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: "access-1" });
    const cookie = res.cookies.get("refresh_token");
    expect(cookie?.value).toBe("refresh-1");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("forwards the backend error status on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(backendResponse(false, { message: "Bad credentials" }, 401)),
    );

    const res = await loginHandler(
      jsonRequest("http://localhost/api/auth/login", { email: "a@b.c", password: "x" }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Bad credentials" });
  });
});

describe("refreshHandler", () => {
  it("rotates the refresh cookie and returns a new access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        backendResponse(true, {
          success: true,
          data: { access_token: "access-2", refresh_token: "refresh-2" },
        }),
      ),
    );

    const res = await refreshHandler(
      jsonRequest("http://localhost/api/auth/refresh", {}, "refresh_token=refresh-1"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: "access-2" });
    expect(res.cookies.get("refresh_token")?.value).toBe("refresh-2");
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await refreshHandler(jsonRequest("http://localhost/api/auth/refresh", {}));
    expect(res.status).toBe(401);
  });
});

describe("logoutHandler", () => {
  it("clears the refresh cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backendResponse(true, {})));
    const res = await logoutHandler(
      jsonRequest("http://localhost/api/auth/logout", {}, "refresh_token=refresh-1"),
    );
    expect(res.status).toBe(200);
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
