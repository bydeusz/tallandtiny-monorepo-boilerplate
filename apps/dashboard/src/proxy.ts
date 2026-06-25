import { createAuthMiddleware } from "@repo/auth/server";

export const proxy = createAuthMiddleware({
  authRoutes: ["/login", "/register", "/reset-password", "/verify"],
  protectedRoutes: ["/", "/settings", "/support"],
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
