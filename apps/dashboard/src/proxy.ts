import { createAuthMiddleware } from "@repo/auth/server";

export const proxy = createAuthMiddleware({
  authRoutes: ["/login", "/reset-password"],
  protectedRoutes: ["/", "/settings", "/support"],
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
