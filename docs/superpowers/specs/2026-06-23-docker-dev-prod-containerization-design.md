# Docker: Dev Infra + Production Containerization — Design

**Date:** 2026-06-23
**Status:** Approved
**Author:** Tadeusz de Ruijter (with Claude)

## 1. Purpose

Adapt the `_docker` setup from the standalone `nestjs-boilerplate` into the
tallandtiny Turborepo/pnpm monorepo. Two outcomes:

1. **Richer dev infra** — extend the existing dev compose with the supporting
   services the boilerplate provides (`redis`, `mailpit`), alongside the
   current `postgres` + `minio` (+ bucket bootstrap).
2. **Production containerization** — add what tallandtiny lacks today: a
   monorepo-aware `Dockerfile` and a `docker-compose.prod.yml` that builds and
   runs `apps/api` in a container, with a one-shot Prisma migrate step.

This is **step 1 of a larger goal**: porting the full `nestjs-boilerplate`
(auth, BullMQ queues + worker, mail, S3 uploads) into this monorepo as
`apps/api`. The docker setup must therefore be **forward-compatible** with that
future, without building speculative parts now (YAGNI).

The boilerplate's `_docker` cannot be copied verbatim: it assumes a single-app
**npm** project at the repo root (`npm ci`, `npm run build`, `dist/src/main.js`,
port 3010). tallandtiny is **pnpm + Turborepo**, the NestJS app lives at
`apps/api` (builds to `apps/api/dist/main.js`, port 3001, `/api` prefix), and
Prisma lives in `packages/database` (`@repo/database`, Prisma 7).

## 1a. Current state (verified)

| Aspect | tallandtiny today |
|---|---|
| Existing `_docker` | `docker-compose.yml` (dev infra only): `postgres:16`, `minio`, `minio-init` (auto-creates bucket). `name: tallandtiny`. Reads `_docker/.env`. No Dockerfile, no prod compose. |
| API | `apps/api`, NestJS 11, port 3001, global prefix `api`, Swagger at `/api/docs`. Build: `nest build` → `apps/api/dist/main.js`. Run: `node dist/main.js`. **No health endpoint.** No worker entrypoint (only `src/main.ts`). |
| Database | `packages/database` = `@repo/database`. Prisma 7, schema at `packages/database/prisma/schema.prisma` (`prisma-client` generator → `src/generated/prisma`), `@prisma/adapter-pg` + `pg`. Compiled package (`build: tsc` → `dist/index.js`). Migrations exist (`prisma/migrations/20260618231838_init`). `db:deploy` = `prisma migrate deploy`. |
| Env split | `_docker/.env(.example)` = infra creds (`POSTGRES_*`, `MINIO_*`). Root `.env(.example)` = app runtime (`DATABASE_URL`, `NEXT_PUBLIC_API_URL`, `S3_*`). |
| Root scripts | `docker:up`, `docker:down` already exist. |
| Turborepo | `build` `dependsOn` `db:generate` + `^build` + `^db:generate`, so `turbo build --filter=api` generates the Prisma client, builds `@repo/database`, then builds the api. |

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Dev infra services | Keep `postgres` + `minio` + `minio-init`; **add `redis` + `mailpit`** | User wants infra ready locally for the future boilerplate port. minio-init (bucket bootstrap) is kept — it's better than the boilerplate's. |
| Prod compose services | **Lean**: `postgres`, `minio` (+ bucket init), `migrate`, `api` | Only what's needed to run the app today. redis/worker documented for later; mailpit never belongs in prod. |
| Worker service | **Not built now**; documented as a later same-image service | No `main-worker` entrypoint exists — a worker service would be broken. The image is multi-entrypoint-capable, so adding it later is a compose-only change. |
| Redis in prod | **Not now**; documented "add here" block | The api has no redis/queue dependency yet. Belongs in prod once queues/worker are ported. |
| Mailpit in prod | **Never** | It is a dev mail-catcher. Prod points `SMTP_*` at a real provider. Dev-only. |
| API healthcheck | **Add minimal `GET /api/health`** + compose healthcheck | Real readiness signal; lets other containers wait on it. A few lines of NestJS code. |
| Dockerfile build strategy | **`turbo prune api --docker`** multi-stage | Official Turborepo Docker approach (`./.docs/turborepo/guides/tools/docker.mdx`): small, cache-friendly, stable as the repo grows. |
| Prisma engine handling | **No `binaryTargets` / openssl work** | Prisma 7 + `prisma-client` generator + `@prisma/adapter-pg` runs without a Rust query engine binary, so Alpine stays simple. |
| Compose conventions | **Follow tallandtiny's existing style** (`name: tallandtiny`, `_docker/.env`, healthchecks) | Consistency with the working dev compose over the boilerplate's `${COMPOSE_PROJECT_NAME}`/`--env-file` style. |
| Base image | `node:22-alpine` | Matches engines `>=22.12`; small. |

## 3. Deliverables

### 3.1 `_docker/docker-compose.yml` (modify — extend dev infra)

Keep existing `postgres`, `minio`, `minio-init`, named volumes, `name: tallandtiny`.
Add two services in the same style (healthchecks, `restart: unless-stopped`,
reading vars from `_docker/.env`):

- **`redis`** — `redis:latest`, port `${REDIS_PORT}:6379`, named volume
  `redis-data:/data`, healthcheck `redis-cli ping`.
- **`mailpit`** — `axllent/mailpit:latest`, SMTP port `${MAILPIT_SMTP_PORT:-1025}:1025`,
  UI port `${MAILPIT_UI_PORT:-8025}:8025`, healthcheck on `:8025/api/v1/info`.

### 3.2 `_docker/Dockerfile` (create — pnpm/Turborepo multi-stage)

Targets:

1. **`base`** — `node:22-alpine`, enable `corepack`/pnpm, `WORKDIR /app`.
2. **`prune`** — install turbo, `COPY . .`, run `turbo prune api --docker` →
   produces `out/json` (package manifests + pruned lockfile) and `out/full`
   (source).
3. **`installer`** — copy `out/json`, `pnpm install --frozen-lockfile` (cached
   unless manifests/lockfile change), copy `out/full`, run
   `pnpm turbo build --filter=api` (generates Prisma client, builds
   `@repo/database`, builds `apps/api`).
4. **`prod-deps`** — from `out/json`, `pnpm install --frozen-lockfile --prod`
   (runtime deps only: `@prisma/client`, `@prisma/adapter-pg`, `pg`, NestJS
   runtime, etc.).
5. **`migrator`** — has the Prisma CLI + schema + migrations (reuses the
   `installer` deps). Default `CMD` runs `pnpm --filter @repo/database db:deploy`
   (`prisma migrate deploy`). Used by the prod `migrate` service.
6. **`runner`** — non-root user; copy prod `node_modules`, `apps/api/dist`,
   `packages/database/dist` (includes the compiled generated Prisma client),
   and the needed `package.json`s. `WORKDIR /app/apps/api`. `EXPOSE 3001`.
   `CMD ["node", "dist/main.js"]`.

The image is **multi-entrypoint-capable**: a future `worker` reuses the same
`runner` image with `command: ["node", "dist/main-worker.js"]` once that
entrypoint exists — no Dockerfile change.

### 3.3 `_docker/docker-compose.prod.yml` (create — lean prod stack)

- **`postgres`**, **`minio`**, **`minio-init`** — same images/healthchecks as dev.
- **`migrate`** — `build: { context: .., dockerfile: _docker/Dockerfile, target: migrator }`,
  `restart: "no"`, `DATABASE_URL` pointing at the `postgres` service host,
  `depends_on: postgres (service_healthy)`. Runs `prisma migrate deploy` and exits.
- **`api`** — `build: { context: .., dockerfile: _docker/Dockerfile, target: runner }`,
  env `DATABASE_URL` (→ `postgres` service), `S3_ENDPOINT` (→ `minio` service),
  `PORT`, `NODE_ENV=production`; `ports: ${PORT}:${PORT}`;
  `depends_on: migrate (service_completed_successfully)` + postgres/minio healthy;
  healthcheck hits `/api/health` via `node -e "fetch(...)"`.
- A **commented, documented block** showing how to add `redis` (service +
  `REDIS_*` env on api) and a `worker` (same image, `command: node dist/main-worker.js`)
  when the boilerplate port lands.
- Named volumes `postgres-data`, `minio-data`.

`build.context` is the repo root (`..`) so `turbo prune` sees the whole workspace.

### 3.4 `apps/api` — minimal health endpoint (create)

A tiny health module/controller exposing `GET /api/health` returning HTTP 200
with a small JSON body (e.g. `{ status: 'ok' }`). Wired into `AppModule`. Used
by the prod `api` healthcheck. No external dependency (no `@nestjs/terminus`)
to keep it minimal; a richer health setup can come with the boilerplate port.

### 3.5 `.dockerignore` (create at repo root)

`node_modules`, `**/node_modules`, `**/dist`, `**/.next`, `.turbo`, `**/.turbo`,
`.git`, `.env`, `.env.*` (keep `!.env.example`), `_docker/storage`, `**/*.md` as
appropriate. Keeps the build context (sent to the Docker daemon, and the input
to `turbo prune`) small. `build.context` is the repo root.

### 3.6 Env files (modify)

- `_docker/.env` + `_docker/.env.example` — add `REDIS_PORT`,
  `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`, and `PORT` (api port for prod compose).
  Keep existing `POSTGRES_*`, `MINIO_*`.
- Root `.env.example` — keep "infra ready" comments; no new app vars required
  (the api reads `DATABASE_URL` via `@repo/database` and `PORT`).

### 3.7 Root `package.json` scripts (modify)

Keep `docker:up`, `docker:down`. Add:
- `docker:reset` — `docker compose -f _docker/docker-compose.yml down -v`
- `docker:prod:build` — `docker compose -f _docker/docker-compose.prod.yml build`
- `docker:prod:up` — `... up -d`
- `docker:prod:down` — `... down`
- `docker:prod:logs` — `... logs -f api`

## 4. How it works (data flow)

**Dev (`docker:up`)** — boots `postgres` + `minio` (+ bucket) + `redis` +
`mailpit`. The api runs **outside** Docker (`pnpm dev`) against these
containers, exactly as today.

**Prod (`docker:prod:up`)**:
1. Docker builds the api image via `turbo prune api --docker` (build context =
   repo root): prune → `pnpm install` → `turbo build --filter=api`
   (Prisma generate → build `@repo/database` → build api) → prod-deps → runner.
2. `postgres`/`minio` start and become healthy; `minio-init` creates the bucket.
3. `migrate` runs `prisma migrate deploy` against `postgres` and exits 0.
4. `api` starts after migrate completes, listens on `${PORT}`, and reports
   healthy once `GET /api/health` returns 200.

## 5. Verification

1. `pnpm check-types` — the new health endpoint type-checks; nothing else breaks.
2. **Dev infra:** `pnpm docker:up`; confirm `postgres`, `minio`, `redis`,
   `mailpit` reach healthy (`docker compose -f _docker/docker-compose.yml ps`);
   mailpit UI reachable at `http://localhost:8025`. `pnpm docker:down` after.
3. **Image build:** `pnpm docker:prod:build` completes (validates the
   `turbo prune` Dockerfile end-to-end: prune, install, generate, build).
4. **Prod stack:** `pnpm docker:prod:up`; `migrate` exits 0; `api` becomes
   healthy; `curl http://localhost:${PORT}/api/health` returns 200;
   `http://localhost:${PORT}/api/docs` serves Swagger. `pnpm docker:prod:down -v`.
5. **Health endpoint unit test:** a NestJS test asserting `GET /api/health`
   returns 200 + `{ status: 'ok' }`.

## 6. Out of scope (YAGNI / later)

- The actual boilerplate port (auth, BullMQ queues, the worker entrypoint,
  mail sending, S3 upload integration). The worker service + redis-in-prod are
  **documented** in `docker-compose.prod.yml`, not built.
- CI/CD pipelines, image registry / push, multi-arch builds.
- Remote Turborepo caching during Docker builds (`TURBO_TOKEN`/`TURBO_TEAM`).
- `@nestjs/terminus` / deep dependency health probes — the minimal
  `/api/health` is enough for the container healthcheck now.
- Changing the dev workflow (api still runs outside Docker in dev).
