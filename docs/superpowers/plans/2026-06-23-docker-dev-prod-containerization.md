# Docker: Dev Infra + Production Containerization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the `nestjs-boilerplate` `_docker` setup into this pnpm/Turborepo monorepo — extend dev infra with redis + mailpit, and add a monorepo-aware Dockerfile + production compose that builds and runs `apps/api` with a Prisma migrate step and a `/api/health` endpoint.

**Architecture:** A minimal NestJS health endpoint is added to `apps/api`. The dev compose (`_docker/docker-compose.yml`) gains `redis` + `mailpit`. A multi-stage `_docker/Dockerfile` uses `turbo prune api --docker` to build a small production image plus a `migrator` target. A lean `_docker/docker-compose.prod.yml` orchestrates `postgres + minio + migrate + api`, with worker/redis-in-prod documented (not built) for the future boilerplate port.

**Tech Stack:** Docker + Docker Compose · Turborepo (`turbo prune`) · pnpm 10.28.2 · Node 22 (alpine) · NestJS 11 · Prisma 7 (`@prisma/adapter-pg`, no Rust engine) · Jest + ts-jest.

## Global Constraints

- **Base image:** `node:22-alpine` (matches engines `>=22.12`).
- **Package manager in image:** pnpm `10.28.2` via corepack (matches root `packageManager`).
- **Build strategy:** `turbo prune api --docker` (official Turborepo Docker approach; `./.docs/turborepo/guides/tools/docker.mdx`). Do NOT copy the whole repo + install.
- **No Prisma engine handling:** Prisma 7 + `prisma-client` generator + `@prisma/adapter-pg` runs without a Rust query engine binary — no `binaryTargets`, no openssl steps.
- **Compose conventions:** follow the existing dev compose — `name: <project>`, healthchecks on every long-running service, `restart: unless-stopped`, infra vars read from `_docker/.env` (auto-loaded because the compose files live in `_docker/`).
- **Prod stack is lean:** `postgres`, `minio` (+ bucket init), `migrate`, `api` only. `redis` and `worker` are **documented as commented blocks**, not active services. `mailpit` is **never** in prod.
- **Worker:** not built now (no `main-worker` entrypoint). The image must be multi-entrypoint-capable so a future worker is a compose-only addition (`command: ["node", "dist/main-worker.js"]`, same image).
- **API facts:** global prefix `api`, port `3001`, build → `apps/api/dist/main.js`, run `node dist/main.js`. Health route must resolve at `/api/health`.
- **Spec files stay out of the build/image:** add `apps/api/tsconfig.build.json` excluding `**/*.spec.ts`.
- **Commit messages** follow Conventional Commits and end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

**Note on Docker availability:** Tasks 2–4 verify with real `docker` commands. `docker compose config` only needs the CLI; `build`/`up` need a running Docker daemon and can take several minutes (image pulls + an in-container `pnpm install` + `turbo build`). If the daemon is unavailable in the worker's environment, run `docker compose config` as the gate and flag the build/up steps to the controller to run (or the user).

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/api/src/health/health.controller.ts` (create) | `GET /health` (→ `/api/health` with the global prefix) returning `{ status: 'ok' }` |
| `apps/api/src/health/health.module.ts` (create) | NestJS module exposing `HealthController` |
| `apps/api/src/health/health.controller.spec.ts` (create) | Unit test for the controller method |
| `apps/api/src/app.module.ts` (modify) | Register `HealthModule` |
| `apps/api/package.json` (modify) | Add jest devDeps, jest config, `test` script |
| `apps/api/tsconfig.build.json` (create) | Keep `*.spec.ts` out of `nest build` output (and the image) |
| `_docker/docker-compose.yml` (modify) | Dev infra: add `redis` + `mailpit` to existing `postgres`/`minio`/`minio-init` |
| `_docker/Dockerfile` (create) | Multi-stage monorepo build: `prune → build → prod-deps → migrator + runner` |
| `.dockerignore` (create, repo root) | Shrink the build context sent to the daemon / fed to `turbo prune` |
| `_docker/docker-compose.prod.yml` (create) | Lean prod stack: `postgres + minio + migrate + api`; commented redis/worker |
| `_docker/.env` + `_docker/.env.example` (modify) | Add `REDIS_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` (Task 2) and `PORT` (Task 4) |
| `package.json` (root, modify) | Add `docker:reset` + `docker:prod:*` scripts |

---

### Task 1: Minimal `/api/health` endpoint (+ jest setup)

**Files:**
- Modify: `apps/api/package.json` (add jest devDeps, jest config, `test` script)
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/health/health.controller.spec.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: nothing (no DB, no other services).
- Produces: `class HealthController { check(): { status: string } }` returning `{ status: 'ok' }`, mounted at route `health` (so `/api/health` after the global `api` prefix). Used by the prod `api` healthcheck in Task 4.

- [ ] **Step 1: Add the jest toolchain + test script to `apps/api/package.json`**

Replace the `scripts` block and the `devDependencies` block, and add a `jest` config block. The resulting file:

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "lint": "eslint \"src/**/*.ts\"",
    "check-types": "tsc --noEmit",
    "test": "jest"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "testEnvironment": "node"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@repo/database": "workspace:*",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^16.4.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "eslint": "^9.17.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Install the new dev dependencies**

Run: `pnpm install`
Expected: completes; `apps/api/node_modules/.bin/jest` exists. The `apps/api:` importer in `pnpm-lock.yaml` gains `jest`, `ts-jest`, `@types/jest`.

- [ ] **Step 3: Create `apps/api/tsconfig.build.json`** (keep specs out of `nest build`)

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

`nest build` uses `tsconfig.build.json` by default when present, so the new spec file will not be emitted into `dist/` (and therefore not into the Docker image).

- [ ] **Step 4: Write the failing test**

Create `apps/api/src/health/health.controller.spec.ts`:

```ts
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok status', () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm --filter api test`
Expected: FAIL — `Cannot find module './health.controller'` (the controller does not exist yet).

- [ ] **Step 6: Implement the controller**

Create `apps/api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 7: Create the module**

Create `apps/api/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 8: Register `HealthModule` in `AppModule`**

Replace `apps/api/src/app.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { MinisModule } from './minis/minis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, MinisModule],
})
export class AppModule {}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter api test`
Expected: PASS — `1 passed`.

- [ ] **Step 10: Type-check and build the api**

Run: `pnpm --filter api check-types && pnpm --filter api build`
Expected: both succeed. Confirm specs are excluded from the build:
Run: `test ! -e apps/api/dist/health/health.controller.spec.js && echo "spec excluded OK"`
Expected: `spec excluded OK`.

- [ ] **Step 11: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.build.json apps/api/src/health apps/api/src/app.module.ts pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(api): add minimal /api/health endpoint

Add a HealthController returning { status: 'ok' } at /api/health (used by
the production container healthcheck) and a minimal jest + ts-jest setup
for apps/api. tsconfig.build.json keeps *.spec.ts out of the build output
and the Docker image.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extend dev infra compose with redis + mailpit

**Files:**
- Modify: `_docker/docker-compose.yml`
- Modify: `_docker/.env`
- Modify: `_docker/.env.example`

**Interfaces:**
- Consumes: infra vars from `_docker/.env` (existing `POSTGRES_*`, `MINIO_*`; new `REDIS_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`).
- Produces: a dev stack with `postgres`, `redis`, `minio` (+ `minio-init`), `mailpit`. No other task depends on this.

- [ ] **Step 1: Add the new infra env vars to `_docker/.env`**

Append to `_docker/.env`:

```
REDIS_PORT=6379
MAILPIT_SMTP_PORT=1025
MAILPIT_UI_PORT=8025
```

- [ ] **Step 2: Mirror them in `_docker/.env.example`**

Append the identical three lines to `_docker/.env.example`.

- [ ] **Step 3: Replace `_docker/docker-compose.yml` with the extended dev stack**

```yaml
name: tintsmith

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} &&
      mc mb --ignore-existing local/${MINIO_BUCKET} &&
      mc anonymous set download local/${MINIO_BUCKET} &&
      echo 'bucket ready';
      "

  mailpit:
    image: axllent/mailpit:latest
    restart: unless-stopped
    ports:
      - "${MAILPIT_SMTP_PORT:-1025}:1025"
      - "${MAILPIT_UI_PORT:-8025}:8025"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8025/api/v1/info"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres-data:
  minio-data:
  redis-data:
```

- [ ] **Step 4: Validate the compose file parses and interpolates**

Run: `docker compose -f _docker/docker-compose.yml config --quiet && echo "compose valid"`
Expected: `compose valid` (no error). This needs only the Docker CLI, not a running daemon. If it reports an unset-variable warning for `REDIS_PORT`/`MAILPIT_*`, the `.env` edit in Steps 1–2 is missing — fix and re-run.

- [ ] **Step 5: Bring up only the new services (additive; does not disturb a running postgres/minio)**

Run: `docker compose -f _docker/docker-compose.yml up -d redis mailpit`
Expected: `redis` and `mailpit` containers start. Then:
Run: `docker compose -f _docker/docker-compose.yml ps`
Expected: `redis` and `mailpit` listed; `redis` reaches `healthy`. The mailpit web UI is reachable at `http://localhost:8025`.

> If the Docker daemon is unavailable, stop after Step 4 (`config` is the syntax gate) and report that Step 5 needs the daemon.

- [ ] **Step 6: Commit**

```bash
git add _docker/docker-compose.yml _docker/.env.example
git commit -m "$(cat <<'EOF'
feat(docker): add redis + mailpit to the dev infra compose

Extend the dev stack with redis (queues/cache) and mailpit (mail catcher)
alongside postgres + minio, readying local infra for the planned
nestjs-boilerplate port. Same conventions: pinned/healthchecked services
reading vars from _docker/.env.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

> Note: `_docker/.env` is git-ignored (only `_docker/.env.example` is tracked), so it is not part of the commit. That is expected.

---

### Task 3: Monorepo Dockerfile (`turbo prune`) + `.dockerignore`

**Files:**
- Create: `.dockerignore` (repo root)
- Create: `_docker/Dockerfile`

**Interfaces:**
- Consumes: the whole workspace as build context (root is the build context); `turbo prune api --docker` selects `api` + its dep `@repo/database`.
- Produces: two build targets used by Task 4 — `runner` (runtime api image, `CMD ["node","dist/main.js"]`, WORKDIR `/app/apps/api`, EXPOSE 3001) and `migrator` (`CMD ["pnpm","run","db:deploy"]`, WORKDIR `/app/packages/database`).

- [ ] **Step 1: Create the root `.dockerignore`**

```
# Dependencies & build outputs (reinstalled / rebuilt inside the image)
node_modules
**/node_modules
**/dist
**/.next
.next
.turbo
**/.turbo

# VCS, env, docs, local state
.git
.gitignore
**/*.md
.env
.env.*
!.env.example
**/.env
**/.env.*
**/coverage

# MinIO runtime data and OS cruft
_docker/storage
.DS_Store
**/.DS_Store
```

- [ ] **Step 2: Create `_docker/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

# ── Base: Node 22 (alpine) with pnpm via corepack ─────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# ── Prune the monorepo down to what `api` needs ───────────────────────
FROM base AS prune
COPY . .
# turbo is a root devDependency; run the pruner via pnpm dlx so we don't
# install the whole workspace first. --docker splits manifests from source.
RUN pnpm dlx turbo@2 prune api --docker

# ── Install all deps, then build api (+ its deps) ─────────────────────
FROM base AS build
# Dummy DATABASE_URL so `prisma generate` (run by `turbo build`) never trips
# on a missing env var. Never used at runtime — real value comes from compose.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Install dependencies first (changes less often than source -> better caching)
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile
# Bring in the pruned source and build (runs db:generate -> build @repo/database -> build api)
COPY --from=prune /app/out/full/ .
RUN pnpm turbo build --filter=api

# ── Production-only dependencies ──────────────────────────────────────
FROM base AS prod-deps
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod

# ── Migrator: runs `prisma migrate deploy` then exits ─────────────────
FROM build AS migrator
WORKDIR /app/packages/database
CMD ["pnpm", "run", "db:deploy"]

# ── Runner: production api ────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
# pnpm's workspace node_modules layout (root .pnpm store + per-package symlinks)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
# Built artifacts: api dist + database dist (incl. the compiled generated Prisma client)
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
USER nestjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Build the `runner` target**

Run (from the repo root): `docker build -f _docker/Dockerfile --target runner -t tintsmith-api:test .`
Expected: build succeeds through all stages and tags `tintsmith-api:test`. The slow stage is `pnpm install` + `pnpm turbo build`; allow several minutes on a cold cache.

- [ ] **Step 4: Build the `migrator` target**

Run: `docker build -f _docker/Dockerfile --target migrator -t tintsmith-migrate:test .`
Expected: build succeeds and tags `tintsmith-migrate:test`.

- [ ] **Step 5: Sanity-check the runner image contents**

Run: `docker run --rm --entrypoint sh tintsmith-api:test -c "node -v && ls dist/main.js && ls ../../packages/database/dist/index.js"`
Expected: prints the Node version (`v22.x`), `dist/main.js`, and `../../packages/database/dist/index.js` — confirming the api build and the linked `@repo/database` are present. (The api itself won't fully boot here without a database; this only checks artifacts.)

> If the Docker daemon is unavailable, report that Steps 3–5 need it; do not mark the task verified without them.

- [ ] **Step 6: Commit**

```bash
git add .dockerignore _docker/Dockerfile
git commit -m "$(cat <<'EOF'
feat(docker): add monorepo Dockerfile (turbo prune) + .dockerignore

Multi-stage build using `turbo prune api --docker`: prune -> install ->
turbo build -> prod-deps, with a `runner` target (node dist/main.js) and a
`migrator` target (prisma migrate deploy). Prisma 7 + driver adapter means
no Rust engine binary, so the alpine image stays simple. The image is
multi-entrypoint-capable for a future worker.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Production compose + prod env + root scripts

**Files:**
- Create: `_docker/docker-compose.prod.yml`
- Modify: `_docker/.env` and `_docker/.env.example` (add `PORT`)
- Modify: `package.json` (root — docker scripts)

**Interfaces:**
- Consumes: the `_docker/Dockerfile` `migrator` and `runner` targets (Task 3); the `/api/health` route (Task 1); infra vars from `_docker/.env`.
- Produces: `docker:prod:*` scripts and a runnable lean prod stack.

- [ ] **Step 1: Add `PORT` to `_docker/.env`**

Append to `_docker/.env`:

```
PORT=3001
```

- [ ] **Step 2: Mirror it in `_docker/.env.example`**

Append the identical `PORT=3001` line to `_docker/.env.example`.

- [ ] **Step 3: Create `_docker/docker-compose.prod.yml`**

```yaml
name: tintsmith-prod

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} &&
      mc mb --ignore-existing local/${MINIO_BUCKET} &&
      mc anonymous set download local/${MINIO_BUCKET} &&
      echo 'bucket ready';
      "

  migrate:
    build:
      context: ..
      dockerfile: _docker/Dockerfile
      target: migrator
    restart: "no"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build:
      context: ..
      dockerfile: _docker/Dockerfile
      target: runner
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET: ${MINIO_BUCKET}
      PORT: ${PORT}
      NODE_ENV: production
    ports:
      - "${PORT}:${PORT}"
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  # ── Later (nestjs-boilerplate port): queues + worker ─────────────────
  # Enable when apps/api gains redis/BullMQ and a worker entrypoint
  # (apps/api/src/main-worker.ts -> dist/main-worker.js). The worker reuses
  # the SAME image (target: runner) with a different command — no Dockerfile
  # change. Also uncomment `redis-data:` under volumes.
  #
  # redis:
  #   image: redis:7
  #   restart: unless-stopped
  #   volumes:
  #     - redis-data:/data
  #   healthcheck:
  #     test: ["CMD", "redis-cli", "ping"]
  #     interval: 5s
  #     timeout: 5s
  #     retries: 10
  #
  # worker:
  #   build:
  #     context: ..
  #     dockerfile: _docker/Dockerfile
  #     target: runner
  #   command: ["node", "dist/main-worker.js"]
  #   restart: unless-stopped
  #   environment:
  #     DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
  #     REDIS_HOST: redis
  #     REDIS_PORT: 6379
  #     NODE_ENV: production
  #   depends_on:
  #     migrate:
  #       condition: service_completed_successfully
  #     redis:
  #       condition: service_healthy

volumes:
  postgres-data:
  minio-data:
  # redis-data:   # uncomment together with the redis service above
```

- [ ] **Step 4: Add the docker scripts to the root `package.json`**

Replace the `scripts` block in the root `package.json` so the docker entries read:

```json
    "docker:up": "docker compose -f _docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f _docker/docker-compose.yml down",
    "docker:reset": "docker compose -f _docker/docker-compose.yml down -v",
    "docker:prod:build": "docker compose -f _docker/docker-compose.prod.yml build",
    "docker:prod:up": "docker compose -f _docker/docker-compose.prod.yml up -d",
    "docker:prod:down": "docker compose -f _docker/docker-compose.prod.yml down",
    "docker:prod:logs": "docker compose -f _docker/docker-compose.prod.yml logs -f api"
```

(Keep all existing non-docker scripts — `build`, `dev`, `lint`, `check-types`, `format`, `db:*`, `gen:queries` — unchanged.)

- [ ] **Step 5: Validate the prod compose parses and interpolates**

Run: `docker compose -f _docker/docker-compose.prod.yml config --quiet && echo "prod compose valid"`
Expected: `prod compose valid`. Any unset-variable error means `PORT` (Step 1) or an infra var is missing from `_docker/.env`.

- [ ] **Step 6: Build the prod stack images**

Run: `pnpm docker:prod:build`
Expected: builds the `migrate` and `api` images (reuses Task 3's Dockerfile). Several minutes on a cold cache.

- [ ] **Step 7: Bring the stack up and verify migrate + health end-to-end**

> Pre-check: if a local dev api is running on port `${PORT}` (3001) outside Docker, stop it first — the `api` container binds the same host port.

Run: `pnpm docker:prod:up`
Then watch readiness:
Run: `docker compose -f _docker/docker-compose.prod.yml ps`
Expected: `migrate` shows `exited (0)`; `api` reaches `healthy` (give it up to ~30s after migrate completes).

Verify the endpoints:
Run: `curl -fsS http://localhost:3001/api/health`
Expected: `{"status":"ok"}`.
Run: `curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/docs`
Expected: `200` (Swagger UI served).

- [ ] **Step 8: Tear the stack down**

Run: `pnpm docker:prod:down -v`
Expected: containers + the prod named volumes (`tintsmith-prod_*`) are removed. (Volumes are namespaced by the `tintsmith-prod` project, so this does not touch the dev `tintsmith` stack's data.)

> If the Docker daemon is unavailable, Step 5 (`config`) is the syntax gate; report that Steps 6–8 need the daemon.

- [ ] **Step 9: Commit**

```bash
git add _docker/docker-compose.prod.yml _docker/.env.example package.json
git commit -m "$(cat <<'EOF'
feat(docker): add lean production compose + docker scripts

docker-compose.prod.yml runs postgres + minio + a one-shot Prisma migrate
(migrate deploy) + the api container (healthchecked on /api/health). redis
and a worker are documented as commented blocks for the future boilerplate
port; mailpit is intentionally dev-only. Adds docker:reset and docker:prod:*
scripts to the root package.json.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- §3.1 dev infra (add redis + mailpit, keep postgres/minio/minio-init) → Task 2. ✓
- §3.2 Dockerfile (base/prune/installer/prod-deps/migrator/runner via `turbo prune`) → Task 3 Step 2. ✓
- §3.3 lean prod compose (postgres/minio/minio-init/migrate/api + commented redis/worker) → Task 4 Step 3. ✓
- §3.4 minimal `/api/health` (no terminus) → Task 1. ✓
- §3.5 root `.dockerignore` → Task 3 Step 1. ✓
- §3.6 env files (redis/mailpit vars Task 2; `PORT` Task 4) → Task 2 Steps 1–2, Task 4 Steps 1–2. ✓
- §3.7 root scripts (`docker:reset`, `docker:prod:*`) → Task 4 Step 4. ✓
- §4 data flow (dev = infra only; prod = build → infra healthy → migrate → api) → encoded in Task 4 `depends_on` + healthchecks. ✓
- §5 verification (check-types, dev infra up, image build, prod up + curl /api/health + /api/docs, health unit test) → Task 1 Steps 9–10, Task 2 Steps 4–5, Task 3 Steps 3–5, Task 4 Steps 5–7. ✓
- §6 out of scope (worker/redis-in-prod documented not built; no CI/registry; no terminus) → commented blocks only in Task 4 Step 3; nothing builds them. ✓
- §2 decisions: Prisma no-engine (no binaryTargets) honored — Dockerfile has no engine handling. ✓; compose conventions (name/healthchecks/_docker/.env) honored. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases". Every create/modify step shows full file content or the exact block; every run step shows the command and expected output. The commented redis/worker blocks are intentional documentation (spec §3.3, §6), not placeholders. ✓

**3. Type/name consistency:**
- `HealthController.check()` returns `{ status: 'ok' }` — defined in Task 1 Step 6, asserted in Step 4, consumed by the Task 4 healthcheck hitting `/api/health`. ✓
- Route: `@Controller('health')` + global prefix `api` ⇒ `/api/health`; the Task 4 healthcheck and Step 7 curl both use `/api/health`. ✓
- Dockerfile targets `migrator` / `runner` (Task 3) match `target:` values in the prod compose (Task 4). ✓
- `PORT=3001` (Task 4 Step 1) matches the api's default port and the `ports`/healthcheck use of `${PORT}`. ✓
- pnpm `10.28.2` in the Dockerfile matches root `packageManager`. ✓
- Volume names `postgres-data` / `minio-data` / `redis-data` consistent across dev compose and prod compose (redis-data commented in prod). ✓
