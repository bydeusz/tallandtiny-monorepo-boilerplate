// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  createAuthMiddleware,
} from "./server";

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

  it("returns 502 when the backend responds ok but with no tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(backendResponse(true, { success: true, data: {} })),
    );

    const res = await loginHandler(
      jsonRequest("http://localhost/api/auth/login", { email: "a@b.c", password: "pw" }),
    );

    expect(res.status).toBe(502);
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
    const cookie = res.cookies.get("refresh_token");
    expect(cookie?.value).toBe("refresh-2");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
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

const middleware = createAuthMiddleware({
  authRoutes: ["/login", "/register"],
  protectedRoutes: ["/", "/settings"],
});

function nextReq(path: string, cookie?: string): NextRequest {
  return new NextRequest(
    `http://localhost${path}`,
    cookie ? { headers: { cookie } } : undefined,
  );
}

describe("createAuthMiddleware", () => {
  it("redirects an authed user away from an auth route to home", () => {
    const res = middleware(nextReq("/login", "refresh_token=r"));
    expect(res.headers.get("location")).toBe("http://localhost/");
  });
  it("redirects an unauthed user away from a protected route to login", () => {
    const res = middleware(nextReq("/settings"));
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });
  it("lets an authed user reach a protected route", () => {
    const res = middleware(nextReq("/settings", "refresh_token=r"));
    expect(res.headers.get("location")).toBeNull();
  });
  it("treats '/' as exact-match: redirects unauthed on '/' but not on '/public'", () => {
    expect(middleware(nextReq("/")).headers.get("location")).toBe("http://localhost/login");
    expect(middleware(nextReq("/public")).headers.get("location")).toBeNull();
  });
});
