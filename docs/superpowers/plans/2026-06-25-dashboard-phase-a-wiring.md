# Dashboard Phase A — Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire `apps/dashboard` to the shared packages (`@repo/auth`, `@repo/i18n`, `@repo/ui`, `@repo/queries`): dependencies, `next.config` (next-intl plugin + images), the i18n request re-export, the provider-composed root layout, middleware, and the BFF/locale route re-exports — so the app builds with the full runtime in place (no feature pages yet).

**Architecture:** `apps/dashboard` is a Next 16 app. Phase A only touches wiring; the home page stays a placeholder. The `@repo/queries` mutator calls the API directly via `NEXT_PUBLIC_API_URL` (no rewrite); the BFF handlers (`@repo/auth/server`) use the same var server-side. This is Phase A of Plan 5; later phases add the auth surface, shell, and features.

**Tech Stack:** Next.js 16, React 19, next-intl v4, `@repo/auth`, `@repo/i18n`, `@repo/ui`, `@repo/queries`.

## Global Constraints

- Node `>=22.12`; `pnpm@10.28.2`. Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (use `pnpm --filter dashboard <script>`; do not leave the shell in a subdirectory).
- The dashboard dev port is **3002** (`next dev -p 3002` already in package.json). `NEXT_PUBLIC_API_URL` is `http://localhost:3001` (already in `apps/dashboard/.env.local`).
- **No `/api/v1` rewrite** — the `@repo/queries` mutator calls the API directly. The BFF handlers and the client both rely on `NEXT_PUBLIC_API_URL`.
- Phase gate: `pnpm --filter dashboard check-types` per task + `pnpm --filter dashboard build` at the end. No new unit tests (wiring is verified by the build).
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/package.json` *(modify)* — add deps.
- `apps/dashboard/next.config.ts` *(modify)* — next-intl plugin, transpilePackages, images.
- `apps/dashboard/src/i18n/request.ts` *(create)* — re-export `@repo/i18n/request`.
- `apps/dashboard/src/app/layout.tsx` *(modify)* — provider composition + NextIntlClientProvider + font.
- `apps/dashboard/src/app/providers.tsx` *(delete)* — composition moves into layout.
- `apps/dashboard/src/app/globals.css` *(modify)* — `@source` for `@repo/auth` + `@repo/i18n`.
- `apps/dashboard/src/middleware.ts` *(create)* — `createAuthMiddleware`.
- `apps/dashboard/src/app/api/auth/{login,refresh,logout}/route.ts` *(create)* — BFF re-exports.
- `apps/dashboard/src/app/api/language/route.ts` *(create)* — locale handler re-export.

---

### Task 1: Dependencies + next.config + i18n request

**Files:**
- Modify: `apps/dashboard/package.json`, `apps/dashboard/next.config.ts`
- Create: `apps/dashboard/src/i18n/request.ts`

- [ ] **Step 1: Add dependencies**

Add these to `apps/dashboard/package.json` `dependencies` (keep the existing `@repo/queries`, `@repo/ui`, `@tanstack/react-query`, `next`, `react`, `react-dom`):
```json
"@repo/auth": "workspace:*",
"@repo/i18n": "workspace:*",
"flag-icons": "^7.5.0",
"lucide-react": "^0.468.0",
"next-intl": "^4.8.3"
```
(`lucide-react` is needed by `@repo/auth`'s `OrganisationSwitcher` and `@repo/i18n`'s `LanguageSwitcher` — both declare it peer/dev, so the app must provide it. `flag-icons` provides the CSS the `LanguageSwitcher` imports. `next-intl` is needed for the plugin + `NextIntlClientProvider` + `getLocale`/`getMessages`.)

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: the new workspace deps link; `flag-icons`, `lucide-react`, `next-intl` install.

- [ ] **Step 3: Rewrite `next.config.ts`**

Replace `apps/dashboard/next.config.ts` with:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/queries", "@repo/auth", "@repo/i18n"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 4: Create the i18n request re-export**

`apps/dashboard/src/i18n/request.ts`:
```ts
export { default } from "@repo/i18n/request";
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/package.json apps/dashboard/next.config.ts apps/dashboard/src/i18n/request.ts pnpm-lock.yaml
git commit -m "feat(dashboard): deps + next-intl plugin + i18n request wiring"
```

---

### Task 2: Provider-composed root layout + globals

**Files:**
- Modify: `apps/dashboard/src/app/layout.tsx`
- Delete: `apps/dashboard/src/app/providers.tsx`
- Modify: `apps/dashboard/src/app/globals.css`

**Interfaces — Consumes:** `QueryProvider`, `AuthProvider`, `OrganisationProvider` from `@repo/auth`; `Toaster` from `@repo/ui/components/ui/toaster`; `NextIntlClientProvider` + `getLocale`/`getMessages` from `next-intl`.

- [ ] **Step 1: Rewrite `layout.tsx`**

Replace `apps/dashboard/src/app/layout.tsx` with:
```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import {
  QueryProvider,
  AuthProvider,
  OrganisationProvider,
} from "@repo/auth";
import { Toaster } from "@repo/ui/components/ui/toaster";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tall & Tiny Dashboard",
  description: "CMS for tallandtiny",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontSans.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <OrganisationProvider>
                {children}
                <Toaster />
              </OrganisationProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Delete the obsolete providers file**

Run: `git rm apps/dashboard/src/app/providers.tsx`
(The composition now lives in `layout.tsx`. If any file still imports `./providers`, it will surface in check-types — there should be none besides the old layout.)

- [ ] **Step 3: Extend `globals.css` with `@source` for the new packages**

`apps/dashboard/src/app/globals.css` — add two `@source` lines after the existing one so Tailwind scans the switchers' token classes:
```css
@import 'tailwindcss';
@import '@repo/ui/globals.css';

@source '../../../../packages/ui/src/**/*.{ts,tsx}';
@source '../../../../packages/auth/src/**/*.{ts,tsx}';
@source '../../../../packages/i18n/src/**/*.{ts,tsx}';
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter dashboard check-types`
Expected: PASS. (If it errors that `getMessages` needs the request config, that's resolved by Task 1's plugin wiring — confirm `src/i18n/request.ts` exists. If `Toaster` import path is wrong, verify `@repo/ui` exports `./components/ui/toaster`.)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/layout.tsx apps/dashboard/src/app/globals.css
git commit -m "feat(dashboard): provider-composed root layout + i18n provider + @source"
```

---

### Task 3: Middleware + BFF/locale route re-exports

**Files:**
- Create: `apps/dashboard/src/middleware.ts`
- Create: `apps/dashboard/src/app/api/auth/login/route.ts`, `.../refresh/route.ts`, `.../logout/route.ts`
- Create: `apps/dashboard/src/app/api/language/route.ts`

**Interfaces — Consumes:** `createAuthMiddleware`, `loginHandler`, `refreshHandler`, `logoutHandler` from `@repo/auth/server`; `setLocaleHandler` from `@repo/i18n/server`.

- [ ] **Step 1: Create the middleware**

`apps/dashboard/src/middleware.ts`:
```ts
import { createAuthMiddleware } from "@repo/auth/server";

export const middleware = createAuthMiddleware({
  authRoutes: ["/login", "/register", "/reset-password", "/verify"],
  protectedRoutes: ["/", "/organisation", "/settings", "/support"],
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Create the BFF auth route re-exports**

`apps/dashboard/src/app/api/auth/login/route.ts`:
```ts
export { loginHandler as POST } from "@repo/auth/server";
```
`apps/dashboard/src/app/api/auth/refresh/route.ts`:
```ts
export { refreshHandler as POST } from "@repo/auth/server";
```
`apps/dashboard/src/app/api/auth/logout/route.ts`:
```ts
export { logoutHandler as POST } from "@repo/auth/server";
```

- [ ] **Step 3: Create the locale route re-export**

`apps/dashboard/src/app/api/language/route.ts`:
```ts
export { setLocaleHandler as POST } from "@repo/i18n/server";
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter dashboard check-types`
Expected: PASS. (Route handlers must export a `POST` matching Next's route signature — `loginHandler`/etc. are `(request: Request) => Promise<NextResponse>`, which satisfies it. `createAuthMiddleware` returns `(request: NextRequest) => NextResponse`, which satisfies the middleware signature.)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/middleware.ts apps/dashboard/src/app/api/
git commit -m "feat(dashboard): middleware + BFF auth/language route re-exports"
```

---

### Task 4: Build smoke

**Files:** none (verification task).

- [ ] **Step 1: Type-check the whole app**

Run: `pnpm --filter dashboard check-types`
Expected: PASS.

- [ ] **Step 2: Production build**

Run: `pnpm --filter dashboard build`
Expected: SUCCESS — Next compiles the app with the next-intl plugin, the provider-composed layout, middleware, and the four API routes. The placeholder home page (`/`) prerenders. The four `/api/auth/*` + `/api/language` routes appear as route handlers in the build output.

If the build fails:
- next-intl "Couldn't find next-intl config file" → confirm `next.config.ts` calls `createNextIntlPlugin("./src/i18n/request.ts")` and that file exists (Task 1).
- "Cannot find module '@repo/auth'/'@repo/i18n'" → confirm they're in `dependencies` + `pnpm install` ran (Task 1) and in `transpilePackages`.
- A missing-messages error during prerender → confirm `@repo/i18n/request` resolves the locale + messages (it does; the en/nl catalogs ship in the package).
- `lucide-react` not resolved (from the switchers) → confirm it's in the dashboard `dependencies` (Task 1).
Report any genuine failure with the exact error; do not work around it by deleting wiring.

- [ ] **Step 3: Commit (if the build produced tracked changes; otherwise note verification only)**

The build itself produces no tracked source changes. Record the green build in the report. If `next build` updated a tracked file (e.g. `next-env.d.ts`), commit it:
```bash
git add apps/dashboard/next-env.d.ts
git commit -m "chore(dashboard): build artifacts after Phase A wiring"
```
Otherwise no commit is needed for this task.

---

## Self-Review

**Spec coverage (Phase A slice of the overview):**
- deps (`@repo/auth`,`@repo/i18n`,`next-intl`,`flag-icons`,`lucide-react`) → Task 1. ✓
- `next.config` (next-intl plugin + transpile + images; NO rewrite per the cross-cutting decision) → Task 1. ✓
- `src/i18n/request.ts` re-export → Task 1. ✓
- root layout provider composition + `NextIntlClientProvider` + font → Task 2. ✓
- `globals.css` `@source` for the new packages → Task 2. ✓
- middleware + `app/api/auth/*` + `app/api/language` re-exports → Task 3. ✓
- build gate → Task 4. ✓

**Placeholder scan:** every step has exact content. The home page intentionally stays the existing placeholder (feature pages are later phases) — that's a stated scope boundary, not a placeholder defect.

**Type/name consistency:** `QueryProvider`/`AuthProvider`/`OrganisationProvider` (from `@repo/auth` barrel, Plan 4 Task 5), `Toaster` (`@repo/ui/components/ui/toaster`, Plan 2 Task 7), `@repo/i18n/request` default (Plan 3 Task 3), `loginHandler`/`refreshHandler`/`logoutHandler`/`createAuthMiddleware` (`@repo/auth/server`, Plan 4 Task 2), `setLocaleHandler` (`@repo/i18n/server`, Plan 3 Task 4) — all verified against the produced package APIs.

**Scope check:** wiring only, no feature pages — one coherent, build-verifiable deliverable, 4 tasks.

**Runtime note for reviewers:** the build is the gate. Live auth (the BFF hitting the NestJS API, the middleware redirecting) is verified in later phases / by the human against a running stack; the API CORS must allow `http://localhost:3002` at that point (config in `apps/api`, not a dashboard change).
