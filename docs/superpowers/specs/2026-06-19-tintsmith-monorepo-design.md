# Tall & Tiny Monorepo Scaffold — Design

**Date:** 2026-06-19
**Status:** Approved
**Author:** Tadeusz de Ruijter (with Claude)

## 1. Purpose

Scaffold a Turborepo monorepo for **tallandtiny** (a tool for miniature painters). This is a
first setup: a clean, correct foundation with the full stack wired end-to-end, plus one thin
vertical example slice that proves the whole pipeline works.

**Stack:** Turborepo · pnpm · TypeScript · Next.js (frontend) · NestJS (backend) · Tailwind ·
shadcn/ui · Prisma + Postgres · Swagger (OpenAPI) · Orval · TanStack Query · ESLint · Prettier ·
Docker (Postgres + MinIO).

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Package manager | **pnpm** (v10.28, installed) | Turborepo default, strict, disk-efficient, `workspace:*` protocol |
| Code sharing | **Full shared packages** | Canonical Turborepo layout; best demonstrates the stack; scales |
| Orval input | **Live server URL** (`/api/docs-json`) | Simpler config. Generated output is committed so CI builds don't need a running API |
| Scope | **One end-to-end example slice** (`minis`) | Proves Prisma → Nest → Swagger → Orval → TanStack Query → Next.js works |
| Example model | `Mini { id, name, faction?, isPainted, createdAt }` | Fits the miniature-painting theme |
| MinIO/S3 in app code | **Out of scope** for first slice | Infra (compose + bucket + env) is provided; app integration added later |
| Prisma location | `packages/database` | Shared, compiled package |
| Generated query package | `packages/queries` (`@repo/queries`) | Renamed from `api-client` per user preference |

## 3. Repository layout

```
tallandtiny/
├── apps/
│   ├── web/                 # Next.js (App Router), Tailwind, TanStack Query, consumes @repo/*
│   └── api/                 # NestJS, Swagger, consumes @repo/database
├── packages/
│   ├── ui/                  # shadcn/ui components + Tailwind preset (shared)
│   ├── queries/             # Orval-generated TanStack Query hooks + types + Axios mutator
│   ├── database/            # Prisma schema, migrations, generated client (singleton)
│   ├── eslint-config/       # shared ESLint flat config + Prettier integration
│   └── typescript-config/   # shared tsconfig bases (base / nextjs / nestjs / react-library)
├── _docker/
│   ├── docker-compose.yml   # postgres + minio + minio bucket-init
│   └── .env.example
├── turbo.json
├── pnpm-workspace.yaml
├── package.json             # root scripts, turbo, prettier
├── .prettierrc
├── .env.example
└── tsconfig.json
```

Package namespace: `@repo/*` (unclaimable on npm; easy to rename later).

## 4. Compilation strategy (correctness-critical)

NestJS does **not** transpile its dependencies at runtime; Next.js can. Therefore:

- **`packages/database`** → **compiled** (`tsc` → `dist`); consumed by `apps/api` on the Node
  runtime. Also runs `prisma generate`. Exports a `PrismaClient` singleton.
- **`packages/ui`** and **`packages/queries`** → **just-in-time** (raw TS, no build step);
  consumed only by `apps/web` via Next's `transpilePackages: ["@repo/ui", "@repo/queries"]`.
- **`packages/eslint-config`** / **`packages/typescript-config`** → plain config files, no build.

## 5. The codegen pipeline (heart of the stack)

```
Prisma model (@repo/database)
  → NestJS controller + DTOs (class-validator) with @nestjs/swagger decorators
  → OpenAPI JSON served at http://localhost:3001/api/docs-json
  → Orval (client: react-query, mode: tags-split)
  → @repo/queries hooks (useGetMinis, useCreateMini, ...)
  → apps/web pages call the hooks (fully typed)
```

- Orval `input.target` = the live URL. Regenerate with `pnpm gen:queries` while the API runs.
- Generated output in `packages/queries` is **committed** so `turbo build` works in CI without a
  live server.
- A shared Axios **mutator** in `packages/queries` reads `NEXT_PUBLIC_API_URL` for the base URL,
  giving one place to add interceptors/auth later.

## 6. Naming & readability (explicit requirement)

Hook names derive from the OpenAPI `operationId`. Default NestJS output is ugly
(`MinisController_findAll` → `useMinisControllerFindAll`). We fix this on both ends.

**NestJS side (the source of truth):**

1. Strip the controller prefix via `operationIdFactory`:
   ```ts
   SwaggerModule.createDocument(app, config, {
     operationIdFactory: (controllerKey, methodKey) => methodKey,
   });
   ```
2. Intentional, verb-based controller method names — these become the hook names:
   `getMinis`, `getMini`, `createMini`, `updateMini`, `deleteMini`.
3. `@ApiTags('minis')` so Orval's `tags-split` mode produces one clean file
   `packages/queries/minis.ts` grouping all minis hooks.
4. Clean DTO names → clean generated types: `Mini` (response), `CreateMiniDto`, `UpdateMiniDto`
   become the TypeScript types and hook parameters 1:1.
5. Enable the **`@nestjs/swagger` CLI plugin** (in `nest-cli.json`, `introspectComments: true`)
   so DTO fields are picked up automatically (less `@ApiProperty` boilerplate) and JSDoc comments
   become OpenAPI descriptions.

**Orval side (fallback):** `override.operationName` is available for normalization but is not
needed when `operationId`s are already clean.

**Resulting developer experience:**

```ts
controller.getMinis()       → operationId "getMinis"   → useGetMinis()
controller.createMini(dto)  → operationId "createMini" → useCreateMini({ data: CreateMiniDto })
class CreateMiniDto {...}    → type CreateMiniDto        (the hook's body type)
```

In `apps/web` you write `const { data } = useGetMinis()` and
`const { mutate } = useCreateMini()` — fully typed from the DTOs.

## 7. Components

### 7.1 `packages/typescript-config`
Shared `tsconfig` bases: `base.json`, `nextjs.json`, `nestjs.json`, `react-library.json`.
Each app/package extends the relevant base.

### 7.2 `packages/eslint-config`
Shared ESLint **flat config** (ESLint 9) with variants for base, Next.js, and NestJS, plus
Prettier integration (`eslint-config-prettier`). Prettier itself is a root dev dependency with a
root `.prettierrc` and a root `format` script.

### 7.3 `packages/database`
- Prisma schema with the `Mini` model.
- Compiled package (`tsc` → `dist`); `build` runs `prisma generate` then `tsc`.
- Exports a `PrismaClient` singleton (`@repo/database`).
- Owns migrations; `db:migrate` and `db:generate` run here.
- `DATABASE_URL` from env (points at the Docker Postgres).

`Mini` model:
```prisma
model Mini {
  id        String   @id @default(cuid())
  name      String
  faction   String?
  isPainted Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### 7.4 `apps/api` (NestJS)
- NestJS with global `ValidationPipe` (whitelist + transform), CORS enabled for the web origin.
- `PrismaModule` wrapping `@repo/database`.
- `MinisModule`: controller (verb-named methods) + service (Prisma-backed) + DTOs
  (`CreateMiniDto`, `UpdateMiniDto`) and a `Mini` response model, decorated for Swagger and
  validated with class-validator.
- Swagger UI at `/api/docs`, JSON at `/api/docs-json`; `operationIdFactory` strips prefixes.
- `@nestjs/swagger` CLI plugin enabled in `nest-cli.json`.
- Runs on port **3001**.

Endpoints: `GET /minis`, `GET /minis/:id`, `POST /minis`, `PATCH /minis/:id`,
`DELETE /minis/:id`.

### 7.5 `packages/ui` (shadcn/ui)
- shadcn/ui components (Tailwind 4 mode), exported via an `exports` map (just-in-time TS).
- Shared Tailwind preset/theme tokens consumed by `apps/web`.
- A handful of components needed by the example slice (e.g. `button`, `input`, `card`).

### 7.6 `packages/queries` (Orval)
- `orval.config.ts`: `input.target` = `http://localhost:3001/api/docs-json`;
  `output` → `client: 'react-query'`, `mode: 'tags-split'`, schemas dir, Axios mutator.
- Generated hooks + types (committed).
- Depends on `@tanstack/react-query` and `axios`.

### 7.7 `apps/web` (Next.js)
- Next.js App Router, TypeScript, Tailwind 4, shadcn via `@repo/ui`.
- A `QueryClientProvider` wired in the root layout/provider.
- `transpilePackages: ["@repo/ui", "@repo/queries"]`.
- `NEXT_PUBLIC_API_URL` env for the API base URL.
- Example page: lists minis with `useGetMinis()` and a shadcn form that creates one with
  `useCreateMini()` + query invalidation on success.
- Runs on port **3000**.

## 8. Docker (`_docker/`)

`docker-compose.yml`:
- **postgres:16** → `localhost:5432`, named volume, creds from `_docker/.env`.
- **minio** → API `:9000`, console `:9001`, creds from `_docker/.env`, named volume.
- **minio-init** → one-shot container using `mc` to create the default bucket, then exits.

`_docker/.env.example` documents all values. App-level `.env.example` (root) carries
`DATABASE_URL`, `NEXT_PUBLIC_API_URL`, and the MinIO/S3 vars (`S3_ENDPOINT`, `S3_ACCESS_KEY`,
`S3_SECRET_KEY`, `S3_BUCKET`) so they're ready when S3 integration is added later.

## 9. Turborepo tasks & root scripts

**`turbo.json`:**
- `build` — `dependsOn: ["^build"]`, outputs cached (`.next/**`, `dist/**`).
- `dev` — `persistent: true`, `cache: false`.
- `lint` — depends on `^build` where needed.
- `check-types` — `tsc --noEmit` per package.
- `db:generate` — Prisma client generation.
- `gen:queries` — Orval generation (manual; requires API running).

**Root `package.json` scripts:**
`dev`, `build`, `lint`, `format` (Prettier), `check-types`, `db:migrate`, `db:generate`,
`gen:queries`, `docker:up` (`docker compose -f _docker/docker-compose.yml up -d`),
`docker:down`.

## 10. Target versions

Verified against local/Context7 docs during implementation (not from memory):
Turborepo 2 · Next.js 16 / React 19 · NestJS 11 · **Prisma 7** · TanStack Query 5 ·
Tailwind 4 · Orval 7 · shadcn (Tailwind-4 mode) · ESLint 9 (flat) · Prettier 3.

## 11. Definition of done (verification)

1. `pnpm install` succeeds.
2. `pnpm docker:up` brings up Postgres + MinIO (bucket created).
3. `pnpm db:migrate` creates the `Mini` table.
4. `pnpm build`, `pnpm lint`, `pnpm check-types` all pass.
5. `apps/api` boots; Swagger UI at `http://localhost:3001/api/docs` and JSON at `/api/docs-json`
   reachable; `operationId`s are clean (`getMinis`, `createMini`, ...).
6. `pnpm gen:queries` (with API running) produces readable hooks in `packages/queries`.
7. `apps/web` renders the minis list and the create form, talking to the running API
   through the generated hooks.

## 12. Out of scope (this slice)

- Authentication / authorization.
- Actual S3/MinIO usage in app code (upload/download endpoints).
- CI/CD pipelines, remote caching, deployment.
- Tests beyond what's needed to prove wiring (the scaffold favours a working vertical slice;
  a test setup can be a follow-up).
- Additional domain models beyond `Mini`.
