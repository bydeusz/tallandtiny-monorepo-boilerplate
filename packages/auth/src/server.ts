import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type BackendTokens = {
  access_token?: string;
  refresh_token?: string;
  message?: string;
  data?: { access_token?: string; refresh_token?: string };
};

function parseBackendBody(text: string): BackendTokens {
  return text ? (JSON.parse(text) as BackendTokens) : {};
}

function readRefreshToken(request: Request): string | undefined {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`)) {
      return trimmed.slice(REFRESH_TOKEN_COOKIE_NAME.length + 1);
    }
  }
  return undefined;
}

function setRefreshCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function loginHandler(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = parseBackendBody(await response.text());
    const accessToken = data.access_token ?? data.data?.access_token;
    const refreshToken = data.refresh_token ?? data.data?.refresh_token;

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message ?? "Login failed" },
        { status: response.status },
      );
    }
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { message: "Invalid token response from backend" },
        { status: 502 },
      );
    }

    const nextResponse = NextResponse.json({ access_token: accessToken }, { status: 200 });
    setRefreshCookie(nextResponse, refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS);
    return nextResponse;
  } catch {
    return NextResponse.json({ message: "Unexpected login error" }, { status: 500 });
  }
}

export async function refreshHandler(request: Request): Promise<NextResponse> {
  try {
    const refreshToken = readRefreshToken(request);
    if (!refreshToken) {
      return NextResponse.json({ message: "Missing refresh token" }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
    });
    const data = parseBackendBody(await response.text());
    const accessToken = data.access_token ?? data.data?.access_token;
    const rotated = data.refresh_token ?? data.data?.refresh_token;

    if (!response.ok) {
      const nextResponse = NextResponse.json(
        { message: data.message ?? "Refresh failed" },
        { status: response.status },
      );
      setRefreshCookie(nextResponse, "", 0);
      return nextResponse;
    }
    if (!accessToken || !rotated) {
      const nextResponse = NextResponse.json(
        { message: "Invalid token response from backend" },
        { status: 502 },
      );
      setRefreshCookie(nextResponse, "", 0);
      return nextResponse;
    }

    const nextResponse = NextResponse.json({ access_token: accessToken }, { status: 200 });
    setRefreshCookie(nextResponse, rotated, REFRESH_TOKEN_MAX_AGE_SECONDS);
    return nextResponse;
  } catch {
    return NextResponse.json({ message: "Unexpected refresh error" }, { status: 500 });
  }
}

export async function logoutHandler(request: Request): Promise<NextResponse> {
  try {
    const refreshToken = readRefreshToken(request);
    if (refreshToken) {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
      });
    }
    const nextResponse = NextResponse.json({ message: "Logged out" }, { status: 200 });
    setRefreshCookie(nextResponse, "", 0);
    return nextResponse;
  } catch {
    const nextResponse = NextResponse.json(
      { message: "Unexpected logout error" },
      { status: 500 },
    );
    setRefreshCookie(nextResponse, "", 0);
    return nextResponse;
  }
}

type AuthMiddlewareConfig = {
  authRoutes: string[];
  protectedRoutes: string[];
  loginPath?: string;
  homePath?: string;
};

function pathMatches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route)),
  );
}

export function createAuthMiddleware({
  authRoutes,
  protectedRoutes,
  loginPath = "/login",
  homePath = "/",
}: AuthMiddlewareConfig) {
  return function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;
    const hasRefreshToken = Boolean(
      request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value,
    );

    if (hasRefreshToken && pathMatches(pathname, authRoutes)) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    if (!hasRefreshToken && pathMatches(pathname, protectedRoutes)) {
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
    return NextResponse.next();
  };
}
