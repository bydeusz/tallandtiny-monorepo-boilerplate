import { createAuthMiddleware } from '@repo/auth/server';

export const proxy = createAuthMiddleware({
  authRoutes: ['/login', '/register', '/reset-password', '/verify'],
  protectedRoutes: [], // web's "/" is a PUBLIC landing page — do not protect it
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
