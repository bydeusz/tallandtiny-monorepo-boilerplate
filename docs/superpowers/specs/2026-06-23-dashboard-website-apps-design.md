# Dashboard + Website Apps — Design

**Date:** 2026-06-23
**Status:** Approved
**Author:** Tadeusz de Ruijter (with Claude)

## 1. Purpose

Extend the existing tallandtiny monorepo with two new Next.js applications so the workspace
holds four apps in total, all sourcing their data from the single NestJS backend:

1. `apps/api` — NestJS backend (existing)
2. `apps/web` — the tool app for miniature painters (existing)
3. `apps/dashboard` — **new**: a CMS the user will build out themselves
4. `apps/website` — **new**: a public, content-facing site

This slice is **scaffolding + wiring only**. It stands up the two new apps as exact mirrors of
`apps/web`, wires them to the backend through the existing `@repo/queries` package, and updates
the dev tooling (ports, CORS, auto-open). No features are built inside the new apps.

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Scaffolding approach | **Mirror `apps/web`** (Approach A) | Maximally consistent with the existing setup; minimal; no drift |
| Shared query layer | **Single `@repo/queries`** for all frontends | One OpenAPI source; no auth means no admin/public split needed |
| Auth | **Out of scope** | User builds it later; keeps this slice small |
| Shared boilerplate extraction | **Out of scope** (Approach B deferred) | The duplicated `providers.tsx` is trivial today; revisit when it grows |
| `dashboard` port | **3002** | Next free port after web (3000) / api (3001) |
| `website` port | **3003** | Next free port after dashboard |
| New app contents | **Minimal placeholder page** | Providers wired so any `@repo/queries` hook works; no coupling to the `minis` example |

## 3. App / port map

| App | Directory | Port | Role |
|---|---|---|---|
| api | `apps/api` | 3001 | NestJS backend (existing) |
| web | `apps/web` | 3000 | Tool app (existing) |
| **dashboard** | `apps/dashboard` | **3002** | CMS (user builds the content) |
| **website** | `apps/website` | **3003** | Public content site |

Prisma Studio remains on 5555.

## 4. Per-app structure (exact mirror of `apps/web`)

Both new apps get the following, identical to `apps/web` except for name and port:

```
apps/<dashboard|website>/
├── package.json          # name "dashboard"/"website"; next dev -p <port>; start -p <port>
├── next.config.ts        # transpilePackages: ['@repo/ui', '@repo/queries']
├── tsconfig.json         # extends @repo/typescript-config/nextjs.json
├── eslint.config.mjs     # from @repo/eslint-config/next
├── postcss.config.mjs    # @tailwindcss/postcss
├── next-env.d.ts
├── .env.local            # NEXT_PUBLIC_API_URL="http://localhost:3001"
└── src/app/
    ├── layout.tsx        # imports ./globals.css, wraps children in <Providers>
    ├── providers.tsx     # 'use client' — QueryClientProvider (React Query)
    ├── globals.css       # @import 'tailwindcss'; @import '@repo/ui/globals.css'; @source ../../../../packages/ui/...
    └── page.tsx          # minimal placeholder
```

**Dependencies** (mirroring `apps/web/package.json`):
`next@^16`, `react@^19`, `react-dom@^19`, `@tanstack/react-query`, `@repo/ui` (`workspace:*`),
`@repo/queries` (`workspace:*`); dev: `@repo/eslint-config`, `@repo/typescript-config`,
`@tailwindcss/postcss`, `tailwindcss@^4`, `eslint`, `typescript`, the `@types/*`.

The `globals.css` `@source` path (`../../../../packages/ui/src/**/*.{ts,tsx}`) resolves the same
from `apps/dashboard` and `apps/website` as it does from `apps/web` (same directory depth).

## 5. Wiring to the backend

No change to `@repo/queries`. The Orval-generated `customAxios` mutator already reads
`process.env.NEXT_PUBLIC_API_URL` (falling back to `http://localhost:3001`). Each new app:

- declares `@repo/queries` + `@tanstack/react-query` and renders `<Providers>` in its layout, so
  every generated React Query hook works out of the box;
- ships `.env.local` with `NEXT_PUBLIC_API_URL`.

Placeholder pages stay empty (no import of the `minis` example) — hooks are dropped in by the user.

## 6. API CORS update

`apps/api/src/main.ts` currently allows a single origin:

```ts
app.enableCors({ origin: 'http://localhost:3000' });
```

Change to allow all three frontend origins:

```ts
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
});
```

## 7. Dev tooling

- **`scripts/dev.mjs`** — add two entries to `TARGETS` so `pnpm dev` auto-opens them once reachable:
  `{ name: 'dashboard', url: 'http://localhost:3002' }` and
  `{ name: 'website', url: 'http://localhost:3003' }`.
- **`turbo.json`** — no change. `turbo run dev`/`build` discovers new workspaces automatically;
  `globalEnv` already lists `NEXT_PUBLIC_API_URL` and `PORT`.
- **`pnpm install`** — run once to link the new workspaces.

## 8. Verification

1. `pnpm install` links `dashboard` and `website` as workspaces.
2. `pnpm dev` boots all services; web (3000), api (3001), dashboard (3002), website (3003), and
   Prisma Studio (5555) each open in the browser and render.
3. `pnpm build` and `pnpm check-types` pass for both new apps.
4. A `@repo/queries` hook type-checks when imported into a new app (sanity check of the wiring).

## 9. Out of scope (YAGNI)

- Authentication / login.
- Actual CMS features, content models, and website content.
- New API endpoints or Prisma models.
- Extracting shared frontend boilerplate into a package (Approach B) — revisit when duplication grows.
