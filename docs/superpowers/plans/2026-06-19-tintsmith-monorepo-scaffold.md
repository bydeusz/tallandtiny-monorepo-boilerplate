# Tall & Tiny Monorepo Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working Turborepo monorepo (`tallandtiny`) with a Next.js frontend and NestJS backend, the full shared-package stack wired end-to-end, and one vertical example slice (`Mini`) that proves Prisma → NestJS → Swagger → Orval → TanStack Query → Next.js works.

**Architecture:** pnpm workspace managed by Turborepo. `apps/web` (Next.js) and `apps/api` (NestJS) consume shared `packages/*`. `packages/database` is a **compiled** (tsc→dist, ESM) Prisma 7 package; `packages/ui` and `packages/queries` are **just-in-time** raw-TS packages transpiled by Next.js. The codegen pipeline regenerates typed React Query hooks from the live NestJS OpenAPI document.

**Tech Stack:** Turborepo 2 · pnpm 10.28 · TypeScript 5 · Next.js 16 / React 19 · NestJS 11 · Tailwind 4 · shadcn/ui · Prisma 7 + Postgres 16 · Swagger (`@nestjs/swagger`) · Orval 7 · TanStack Query 5 · ESLint 9 (flat) · Prettier 3 · Docker (Postgres + MinIO).

## Global Constraints

These apply to **every** task. Copy values verbatim.

- **Package manager:** `pnpm@10.28.2`. Root `package.json` sets `"packageManager": "pnpm@10.28.2"`. Workspace deps use `workspace:*`. Never add `workspaces` to root `package.json` (pnpm uses `pnpm-workspace.yaml`).
- **Namespace:** all internal packages are `@repo/*`.
- **Node:** `>= 22.12` required (local is v24.14). This is mandatory because `apps/api` (CommonJS) consumes the ESM `@repo/database` package via Node's `require(ESM)` support.
- **Ports:** `apps/web` → **3000**, `apps/api` → **3001**.
- **API surface:** NestJS uses global prefix `api`. Endpoints live at `/api/minis`. Swagger UI at `/api/docs`, OpenAPI JSON at `/api/docs-json`.
- **Prisma 7 facts (do NOT use v6 muscle memory):** generator provider is `prisma-client` (NOT `prisma-client-js`); `output` is **required**; a driver adapter (`@prisma/adapter-pg` + `pg`) is **mandatory**; DB URL + schema + migrations are configured in `prisma.config.ts` (NOT in the datasource block); the package is **ESM** (`"type": "module"`); `prisma migrate dev` does **not** auto-run `generate`; env vars are loaded via `dotenv`.
- **Tailwind 4 (NOT v3):** use `@import "tailwindcss";` (never `@tailwind base/...`); PostCSS plugin is `@tailwindcss/postcss`; no `tailwind.config.js` / no `content` globs — config is CSS-first (`@theme`).
- **Swagger clean operationIds:** `operationIdFactory: (controllerKey, methodKey) => methodKey` goes in the **3rd arg of `SwaggerModule.createDocument`** (a `SwaggerDocumentOptions`), so hooks become `useGetMinis`, `useCreateMini`, etc.
- **Generated artifacts:** Prisma client output (`packages/database/src/generated/`) is git-ignored. Orval output (`packages/queries/src/generated/`) is **committed** so `turbo build` works in CI without a live API.
- **Verification is the test.** This is infrastructure scaffolding; per the spec's "out of scope" section there are no unit tests beyond proving wiring. Each task's "test" is an explicit build/boot/render command with expected output. Commit after each task.
- **Docs-first:** when a step touches Next.js / NestJS / Turborepo / Prisma, consult the cited `.docs/...` file (CLAUDE.md mandate). External tools not in `.docs` (Orval, shadcn, TanStack Query, ESLint flat config) are flagged inline with the canonical config and a verify step.

---

## File Structure

```
tallandtiny/
├── package.json                      # root: private, packageManager, turbo, prettier, scripts
├── pnpm-workspace.yaml               # workspace globs
├── turbo.json                        # task pipeline
├── .prettierrc                       # prettier config
├── .gitignore                        # add generated + env ignores
├── .env.example                      # DATABASE_URL, NEXT_PUBLIC_API_URL, S3_*
├── _docker/
│   ├── docker-compose.yml            # postgres + minio + minio-init
│   └── .env.example
├── packages/
│   ├── typescript-config/            # base/nextjs/nestjs/react-library tsconfigs
│   ├── eslint-config/                # flat ESLint 9 configs (base/next/nest) + prettier
│   ├── database/                     # Prisma 7 (compiled, ESM): schema, client singleton, migrations
│   ├── queries/                      # Orval-generated React Query hooks (JIT) + axios mutator
│   └── ui/                           # shadcn/ui components + Tailwind 4 theme (JIT)
└── apps/
    ├── api/                          # NestJS 11: minis module, Swagger, Prisma
    └── web/                          # Next.js 16: providers, minis page
```

---

## Task 1: Root workspace skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.prettierrc`, `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: the pnpm/turbo workspace root that every later package plugs into. Turbo tasks: `build`, `dev`, `lint`, `check-types`, `db:generate`, `db:migrate`, `db:deploy`, `format`, `gen:queries`, `docker:up`, `docker:down`.

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

Ref: `.docs/turborepo/crafting-your-repository/structuring-a-repository.mdx`.

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "tallandtiny",
  "private": true,
  "packageManager": "pnpm@10.28.2",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:deploy": "turbo run db:deploy",
    "gen:queries": "turbo run gen:queries",
    "docker:up": "docker compose -f _docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f _docker/docker-compose.yml down"
  },
  "devDependencies": {
    "prettier": "^3.4.2",
    "turbo": "^2.5.0",
    "typescript": "^5.9.0"
  },
  "engines": {
    "node": ">=22.12"
  }
}
```

- [ ] **Step 3: Create `turbo.json`**

Ref: `.docs/turborepo/reference/configuration.mdx` + `.docs/prisma/docs/guides/deployment/turborepo.mdx`. `db:generate` is depended on by `build`/`dev` (so the Prisma client always exists first) and is not cached.

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "globalEnv": ["DATABASE_URL", "NEXT_PUBLIC_API_URL", "PORT"],
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^db:generate"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^db:generate"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "check-types": {
      "dependsOn": ["^build", "^db:generate"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false,
      "persistent": true
    },
    "db:deploy": {
      "cache": false
    },
    "gen:queries": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80
}
```

- [ ] **Step 5: Create root `.env.example`**

```bash
# Postgres (matches _docker/docker-compose.yml)
DATABASE_URL="postgresql://tallandtiny:tallandtiny@localhost:5432/tallandtiny?schema=public"

# Frontend → backend base URL
NEXT_PUBLIC_API_URL="http://localhost:3001"

# MinIO / S3 (infra ready; app integration is a later slice)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="tallandtiny"
S3_SECRET_KEY="tallandtiny-secret"
S3_BUCKET="tallandtiny"
```

- [ ] **Step 6: Append to `.gitignore`**

Add these lines (keep existing content):

```gitignore
# dependencies
node_modules/

# turborepo
.turbo/

# builds
dist/
.next/
out/

# prisma generated client (build artifact; recreated by db:generate)
packages/database/src/generated/

# env
.env
*.env
!.env.example
!_docker/.env.example
```

- [ ] **Step 7: Install and verify**

Run: `cp .env.example .env && pnpm install`
Expected: pnpm resolves the (currently empty) workspace and installs `turbo`, `prettier`, `typescript` at the root with no errors. A `pnpm-lock.yaml` is created.

Run: `pnpm exec turbo run build`
Expected: `No tasks were executed as part of this run.` (or "no packages" — there are no packages yet). No crash.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .prettierrc .env.example .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold turborepo workspace root"
```

---

## Task 2: `packages/typescript-config`

**Files:**
- Create: `packages/typescript-config/package.json`, `base.json`, `nextjs.json`, `nestjs.json`, `react-library.json`

**Interfaces:**
- Produces: `@repo/typescript-config` exposing `base.json`, `nextjs.json`, `nestjs.json`, `react-library.json`. Later packages extend these via `"extends": "@repo/typescript-config/<name>.json"`.

- [ ] **Step 1: Create `packages/typescript-config/package.json`**

```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true
}
```

- [ ] **Step 2: Create `packages/typescript-config/base.json`**

Ref: `.docs/turborepo/guides/tools/typescript.mdx` (verbatim base).

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

- [ ] **Step 3: Create `packages/typescript-config/react-library.json`** (used by `@repo/ui` and `@repo/queries`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true
  }
}
```

- [ ] **Step 4: Create `packages/typescript-config/nextjs.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 5: Create `packages/typescript-config/nestjs.json`**

NestJS compiles to CommonJS and needs decorator metadata. This overrides the ESM base accordingly.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "lib": ["ES2022"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "isolatedModules": false,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true,
    "removeComments": false,
    "noUncheckedIndexedAccess": false
  }
}
```

> Note: `removeComments: false` is required so the `@nestjs/swagger` CLI plugin can read JSDoc when `introspectComments` is enabled (Task 7).

- [ ] **Step 6: Verify**

Run: `pnpm install`
Expected: `@repo/typescript-config` is linked into the workspace with no errors.

Run: `node -e "require('./packages/typescript-config/base.json'); require('./packages/typescript-config/nextjs.json'); require('./packages/typescript-config/nestjs.json'); require('./packages/typescript-config/react-library.json'); console.log('all tsconfig json valid')"`
Expected: `all tsconfig json valid`

- [ ] **Step 7: Commit**

```bash
git add packages/typescript-config pnpm-lock.yaml
git commit -m "feat: add shared @repo/typescript-config"
```

---

## Task 3: `packages/eslint-config`

**Files:**
- Create: `packages/eslint-config/package.json`, `base.js`, `next.js`, `nest.js`

**Interfaces:**
- Produces: `@repo/eslint-config` exposing `./base`, `./next`, `./nest` flat configs. Apps/packages import these in their `eslint.config.mjs`.

> External tooling (not in `.docs`): ESLint 9 flat config. Configs below are the canonical `create-turbo` + typescript-eslint patterns. Verify with the lint run in Step 6.

- [ ] **Step 1: Create `packages/eslint-config/package.json`**

```json
{
  "name": "@repo/eslint-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./base": "./base.js",
    "./next": "./next.js",
    "./nest": "./nest.js"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-turbo": "^2.5.0",
    "globals": "^15.14.0",
    "typescript-eslint": "^8.18.0"
  },
  "peerDependencies": {
    "eslint": "^9.17.0"
  }
}
```

- [ ] **Step 2: Create `packages/eslint-config/base.js`**

```js
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turbo from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: { turbo },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', '**/generated/**'],
  },
];

export default baseConfig;
```

- [ ] **Step 3: Create `packages/eslint-config/next.js`**

```js
import globals from 'globals';
import { baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];

export default nextConfig;
```

> Note: `@next/eslint-plugin-next` and `eslint-plugin-react-hooks` may be added later; the base TS+prettier config is enough to lint the scaffold. If you add the Next plugin, install it in this package and spread `pluginNext.configs.recommended`.

- [ ] **Step 4: Create `packages/eslint-config/nest.js`**

```js
import globals from 'globals';
import { baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export const nestConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS DI relies on decorator metadata; these are noisy in idiomatic Nest code
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];

export default nestConfig;
```

- [ ] **Step 5: Install deps**

Run: `pnpm install`
Expected: the eslint-config dev deps install with no peer errors.

- [ ] **Step 6: Verify the config loads and lints itself**

Create a temporary `packages/eslint-config/eslint.config.mjs`:

```js
import { baseConfig } from './base.js';
export default baseConfig;
```

Run: `pnpm --filter @repo/eslint-config exec eslint base.js next.js nest.js`
Expected: exits 0 (no lint errors). If ESLint reports the config loaded and found no problems, the flat configs are valid.

Then delete the temp file: `rm packages/eslint-config/eslint.config.mjs`

- [ ] **Step 7: Commit**

```bash
git add packages/eslint-config pnpm-lock.yaml
git commit -m "feat: add shared @repo/eslint-config (flat config)"
```

---

## Task 4: `_docker` (Postgres + MinIO) + bring infra up

**Files:**
- Create: `_docker/docker-compose.yml`, `_docker/.env.example`

**Interfaces:**
- Produces: a running Postgres on `localhost:5432` and MinIO on `:9000`/`:9001`, with a created S3 bucket. Consumed by Task 5 (`prisma migrate dev`) and later S3 work.

- [ ] **Step 1: Create `_docker/.env.example`**

```bash
POSTGRES_USER=tallandtiny
POSTGRES_PASSWORD=tallandtiny
POSTGRES_DB=tallandtiny

MINIO_ROOT_USER=tallandtiny
MINIO_ROOT_PASSWORD=tallandtiny-secret
MINIO_BUCKET=tallandtiny
```

- [ ] **Step 2: Create `_docker/docker-compose.yml`**

```yaml
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

volumes:
  postgres-data:
  minio-data:
```

- [ ] **Step 3: Validate compose config**

Run: `cp _docker/.env.example _docker/.env && docker compose -f _docker/docker-compose.yml --env-file _docker/.env config`
Expected: prints the fully-resolved compose config with no errors (env vars substituted).

> Add `_docker/.env` to `.gitignore` (already covered by `*.env` from Task 1; confirm `_docker/.env.example` is NOT ignored).

- [ ] **Step 4: Bring infra up**

Run: `pnpm docker:up`
Expected: `postgres`, `minio`, `minio-init` start. `minio-init` runs once and exits 0 after printing `bucket ready`.

Run: `docker compose -f _docker/docker-compose.yml ps`
Expected: `postgres` and `minio` are `running`/`healthy`.

- [ ] **Step 5: Commit**

```bash
git add _docker/docker-compose.yml _docker/.env.example
git commit -m "feat: add _docker compose for postgres + minio"
```

---

## Task 5: `packages/database` (Prisma 7, compiled ESM)

**Files:**
- Create: `packages/database/package.json`, `tsconfig.json`, `prisma.config.ts`, `prisma/schema.prisma`, `src/client.ts`, `src/index.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` (env), the running Postgres from Task 4.
- Produces: `@repo/database` exporting `prisma` (a `PrismaClient` singleton), the `PrismaClient` class, and all generated model types (`Mini`, `Prisma`, etc.). Built to `dist/` (ESM) for Node consumers.

> Prisma 7 specifics are load-bearing here. Ref: `.docs/prisma/docs/guides/upgrade-prisma-orm/v7.mdx`, `.docs/prisma/docs/guides/deployment/turborepo.mdx`, `.docs/prisma/docs/orm/prisma-schema/overview/generators.mdx`.

- [ ] **Step 1: Create `packages/database/package.json`**

The generated client is emitted **inside `src/`** so the single `tsc` build compiles it into `dist/` for Node consumers.

```json
{
  "name": "@repo/database",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "build": "prisma generate && tsc",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.0",
    "@prisma/client": "^7.0.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/pg": "^8.11.0",
    "dotenv": "^16.4.0",
    "prisma": "^7.0.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

ESM build that includes both our `src` and the generated client (which lands in `src/generated`).

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "noUncheckedIndexedAccess": false,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/database/prisma/schema.prisma`**

Ref: `.docs/prisma/docs/cli/init.mdx` (v7 datasource has NO `url`). Output is inside `src/` for the compiled build.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Mini {
  id        String   @id @default(cuid())
  name      String
  faction   String?
  isPainted Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 4: Create `packages/database/prisma.config.ts`**

Ref: `.docs/prisma/docs/guides/deployment/turborepo.mdx` (verbatim shape). `dotenv/config` loads `DATABASE_URL` (Prisma 7 does not auto-load env).

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

> `env('DATABASE_URL')` throws if the var is missing, and **every** Prisma CLI command loads this file. Ensure `DATABASE_URL` is present (root `.env` is loaded via `dotenv`; for running CLI from the package dir, also create `packages/database/.env` symlink-or-copy, or run with the env exported). Simplest: `cp ../../.env packages/database/.env` is unnecessary if you run `pnpm` from the repo root with the root `.env` present — but Prisma resolves `.env` relative to the config file, so create `packages/database/.env` pointing at the same `DATABASE_URL`.

- [ ] **Step 5: Create `packages/database/.env`** (git-ignored)

```bash
DATABASE_URL="postgresql://tallandtiny:tallandtiny@localhost:5432/tallandtiny?schema=public"
```

- [ ] **Step 6: Install deps and generate the client**

Run: `pnpm install`
Run: `pnpm --filter @repo/database db:generate`
Expected: Prisma generates the `prisma-client` into `packages/database/src/generated/prisma` with no errors. (If you see `Cannot find module './internal/class.js'` later under tsx, add `importFileExtension = "ts"` to the generator block — not expected for tsc.)

- [ ] **Step 7: Create `packages/database/src/client.ts`** (singleton + pg adapter)

Ref: `.docs/prisma/docs/guides/deployment/turborepo.mdx` (verbatim singleton).

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 8: Create `packages/database/src/index.ts`**

```ts
export { prisma } from './client.js';
export * from './generated/prisma/client.js';
```

- [ ] **Step 9: Run the migration (creates the `Mini` table)**

Postgres must be up (Task 4). Prisma 7 `migrate dev` does NOT auto-generate, so generate is a separate step (already done in Step 6).

Run: `pnpm --filter @repo/database db:migrate -- --name init`
Expected: a migration is created under `packages/database/prisma/migrations/<timestamp>_init/` and applied; output ends with `Your database is now in sync with your schema.`

Verify the table exists:
Run: `docker compose -f _docker/docker-compose.yml exec -T postgres psql -U tallandtiny -d tallandtiny -c "\dt"`
Expected: lists a `Mini` table (and `_prisma_migrations`).

- [ ] **Step 10: Build the compiled package**

Run: `pnpm --filter @repo/database build`
Expected: `tsc` compiles `src` (including generated client) into `dist/` with no errors. `packages/database/dist/index.js` and `dist/index.d.ts` exist.

- [ ] **Step 11: Commit** (migrations committed; generated client is git-ignored)

```bash
git add packages/database/package.json packages/database/tsconfig.json packages/database/prisma.config.ts packages/database/prisma/schema.prisma packages/database/prisma/migrations packages/database/src/client.ts packages/database/src/index.ts pnpm-lock.yaml
git commit -m "feat: add @repo/database (prisma 7, compiled esm) with Mini model"
```

---

## Task 6: `apps/api` bootstrap (NestJS + Swagger, boots empty)

**Files:**
- Create: `apps/api/package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `eslint.config.mjs`, `.env`, `src/main.ts`, `src/app.module.ts`, `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts`

**Interfaces:**
- Consumes: `@repo/database` (`prisma`, `PrismaClient`).
- Produces: a bootable NestJS app on port 3001 with global prefix `api`, CORS for `http://localhost:3000`, a global `ValidationPipe`, Swagger UI at `/api/docs` + JSON at `/api/docs-json`, and a shared `PrismaModule` exporting `PrismaService`. `PrismaService extends PrismaClient` and is injectable into feature services.

> Ref: `.docs/nestjs/first-steps.md`, `.docs/nestjs/openapi/introduction.md`, `.docs/nestjs/techniques/validation.md`, `.docs/nestjs/security/cors.md`, `.docs/nestjs/recipes/prisma.md`.

- [ ] **Step 1: Create `apps/api/package.json`**

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
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@repo/database": "workspace:*",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "eslint": "^9.17.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 4: Create `apps/api/nest-cli.json`** (Swagger CLI plugin enabled)

Ref: `.docs/nestjs/openapi/cli-plugin.md`. `introspectComments: true` turns JSDoc into OpenAPI descriptions; `classValidatorShim` stays default (true).

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "introspectComments": true
        }
      }
    ]
  }
}
```

- [ ] **Step 5: Create `apps/api/eslint.config.mjs`**

```js
import { nestConfig } from '@repo/eslint-config/nest';

export default nestConfig;
```

- [ ] **Step 6: Create `apps/api/.env`** (git-ignored)

```bash
DATABASE_URL="postgresql://tallandtiny:tallandtiny@localhost:5432/tallandtiny?schema=public"
PORT=3001
```

- [ ] **Step 7: Create `apps/api/src/prisma/prisma.service.ts`**

Ref: `.docs/nestjs/recipes/prisma.md` (adapted: client comes from `@repo/database`). Wraps the shared singleton via a thin injectable.

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, prisma } from '@repo/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Reuse the configured singleton's connection by delegating queries to it.
    super();
    return prisma as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

> If returning the singleton from the constructor causes type friction with `nestjs` DI, the simpler fallback is to NOT extend and instead expose the singleton: `@Injectable() export class PrismaService { readonly db = prisma; }` and use `this.prisma.db.mini...` in services. Pick whichever the Step 11 boot verifies cleanly; prefer the `extends` form for ergonomic `this.prisma.mini.*` access.

- [ ] **Step 8: Create `apps/api/src/prisma/prisma.module.ts`** (global, exports the service)

Ref: `.docs/nestjs/modules.md` (`@Global` + `exports`).

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 9: Create `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 10: Create `apps/api/src/main.ts`**

Ref: `.docs/nestjs/openapi/introduction.md` (operationIdFactory in `createDocument` 3rd arg), `.docs/nestjs/faq/global-prefix.md`, `.docs/nestjs/security/cors.md`, `.docs/nestjs/techniques/validation.md`. Swagger is mounted at literal path `api/docs` so UI=`/api/docs`, JSON=`/api/docs-json` regardless of global prefix.

```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://localhost:3000' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tall & Tiny API')
    .setDescription('API for tallandtiny — a tool for miniature painters')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  });

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
```

- [ ] **Step 11: Install, build, boot, verify**

Run: `pnpm install`
Run: `pnpm --filter api build`
Expected: `nest build` compiles to `apps/api/dist` with no errors. (Confirms the CommonJS API can resolve the ESM `@repo/database` types.)

Boot it (background): `pnpm --filter api start` (or `pnpm --filter api dev`). Postgres must be up.
Expected log: `API listening on http://localhost:3001/api`.

Run: `curl -s http://localhost:3001/api/docs-json | head -c 200`
Expected: a JSON OpenAPI document starting with `{"openapi":"3.0.0"...` (with empty `paths` for now).

Run (UI): `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/docs`
Expected: `200`.

Stop the server after verifying.

- [ ] **Step 12: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/eslint.config.mjs apps/api/src pnpm-lock.yaml
git commit -m "feat: bootstrap NestJS api with swagger + prisma module"
```

---

## Task 7: `apps/api` Minis CRUD module

**Files:**
- Create: `apps/api/src/minis/dto/create-mini.dto.ts`, `update-mini.dto.ts`, `apps/api/src/minis/entities/mini.entity.ts`, `apps/api/src/minis/minis.service.ts`, `apps/api/src/minis/minis.controller.ts`, `apps/api/src/minis/minis.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (from Task 6).
- Produces: REST endpoints `GET /api/minis`, `GET /api/minis/:id`, `POST /api/minis`, `PATCH /api/minis/:id`, `DELETE /api/minis/:id` with clean operationIds `getMinis`, `getMini`, `createMini`, `updateMini`, `deleteMini`, and DTO-typed request/response shapes that Orval (Task 8) turns into hooks.

> Ref: `.docs/nestjs/controllers.md`, `.docs/nestjs/openapi/operations.md`, `.docs/nestjs/openapi/cli-plugin.md` (DTO files must end in `.dto.ts`/`.entity.ts`; `PartialType` imported from `@nestjs/swagger`).

- [ ] **Step 1: Create `apps/api/src/minis/dto/create-mini.dto.ts`**

The CLI plugin auto-adds `@ApiProperty` from types + comments; class-validator decorators stay for runtime validation.

```ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMiniDto {
  /**
   * Display name of the miniature
   * @example "Space Marine Captain"
   */
  @IsString()
  @MinLength(1)
  name!: string;

  /**
   * Faction the miniature belongs to
   * @example "Ultramarines"
   */
  @IsOptional()
  @IsString()
  faction?: string;

  /** Whether the miniature has been painted */
  @IsOptional()
  @IsBoolean()
  isPainted?: boolean;
}
```

- [ ] **Step 2: Create `apps/api/src/minis/dto/update-mini.dto.ts`**

`PartialType` MUST come from `@nestjs/swagger` (so the plugin + schema pick it up).

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateMiniDto } from './create-mini.dto';

export class UpdateMiniDto extends PartialType(CreateMiniDto) {}
```

- [ ] **Step 3: Create `apps/api/src/minis/entities/mini.entity.ts`** (response model → clean `Mini` type in Orval)

```ts
export class Mini {
  /** Unique identifier (cuid) */
  id!: string;

  /** Display name of the miniature */
  name!: string;

  /** Faction the miniature belongs to */
  faction!: string | null;

  /** Whether the miniature has been painted */
  isPainted!: boolean;

  /** Creation timestamp */
  createdAt!: Date;
}
```

- [ ] **Step 4: Create `apps/api/src/minis/minis.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMiniDto } from './dto/create-mini.dto';
import { UpdateMiniDto } from './dto/update-mini.dto';

@Injectable()
export class MinisService {
  constructor(private readonly prisma: PrismaService) {}

  getMinis() {
    return this.prisma.mini.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getMini(id: string) {
    const mini = await this.prisma.mini.findUnique({ where: { id } });
    if (!mini) throw new NotFoundException(`Mini ${id} not found`);
    return mini;
  }

  createMini(data: CreateMiniDto) {
    return this.prisma.mini.create({ data });
  }

  async updateMini(id: string, data: UpdateMiniDto) {
    await this.getMini(id);
    return this.prisma.mini.update({ where: { id }, data });
  }

  async deleteMini(id: string) {
    await this.getMini(id);
    return this.prisma.mini.delete({ where: { id } });
  }
}
```

- [ ] **Step 5: Create `apps/api/src/minis/minis.controller.ts`**

Verb-named methods → clean operationIds. Response types via `@ApiOkResponse`/`@ApiCreatedResponse` so Orval gets concrete return types.

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateMiniDto } from './dto/create-mini.dto';
import { UpdateMiniDto } from './dto/update-mini.dto';
import { Mini } from './entities/mini.entity';
import { MinisService } from './minis.service';

@ApiTags('minis')
@Controller('minis')
export class MinisController {
  constructor(private readonly minisService: MinisService) {}

  @Get()
  @ApiOkResponse({ type: [Mini] })
  getMinis() {
    return this.minisService.getMinis();
  }

  @Get(':id')
  @ApiOkResponse({ type: Mini })
  getMini(@Param('id') id: string) {
    return this.minisService.getMini(id);
  }

  @Post()
  @ApiCreatedResponse({ type: Mini })
  createMini(@Body() createMiniDto: CreateMiniDto) {
    return this.minisService.createMini(createMiniDto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Mini })
  updateMini(@Param('id') id: string, @Body() updateMiniDto: UpdateMiniDto) {
    return this.minisService.updateMini(id, updateMiniDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Mini })
  deleteMini(@Param('id') id: string) {
    return this.minisService.deleteMini(id);
  }
}
```

- [ ] **Step 6: Create `apps/api/src/minis/minis.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MinisController } from './minis.controller';
import { MinisService } from './minis.service';

@Module({
  controllers: [MinisController],
  providers: [MinisService],
})
export class MinisModule {}
```

- [ ] **Step 7: Register `MinisModule` in `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MinisModule } from './minis/minis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MinisModule],
})
export class AppModule {}
```

- [ ] **Step 8: Build, boot, verify CRUD + clean operationIds**

Run: `pnpm --filter api build`
Expected: compiles with no errors.

Boot: `pnpm --filter api start` (Postgres up). Then:

Run: `curl -s http://localhost:3001/api/minis`
Expected: `[]`

Run: `curl -s -X POST http://localhost:3001/api/minis -H "Content-Type: application/json" -d '{"name":"Test Mini","faction":"Orks"}'`
Expected: a JSON object with `id`, `name":"Test Mini"`, `faction":"Orks"`, `isPainted":false`, `createdAt`.

Run: `curl -s http://localhost:3001/api/minis`
Expected: an array containing the created mini.

Verify clean operationIds:
Run: `curl -s http://localhost:3001/api/docs-json | grep -o '"operationId":"[^"]*"' | sort -u`
Expected: exactly `"operationId":"createMini"`, `"deleteMini"`, `"getMini"`, `"getMinis"`, `"updateMini"` (no `MinisController_` prefixes).

Verify validation:
Run: `curl -s -X POST http://localhost:3001/api/minis -H "Content-Type: application/json" -d '{}'`
Expected: HTTP 400 with a `message` array mentioning `name`.

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/minis apps/api/src/app.module.ts
git commit -m "feat: add minis CRUD module to api"
```

---

## Task 8: `packages/queries` (Orval → TanStack Query hooks)

**Files:**
- Create: `packages/queries/package.json`, `tsconfig.json`, `orval.config.ts`, `src/mutator/custom-axios.ts`, `src/index.ts`
- Generated (committed): `packages/queries/src/generated/**`

**Interfaces:**
- Consumes: the live OpenAPI JSON at `http://localhost:3001/api/docs-json` (Task 7), `NEXT_PUBLIC_API_URL` (runtime).
- Produces: `@repo/queries` exporting typed hooks `useGetMinis`, `useGetMini`, `useCreateMini`, `useUpdateMini`, `useDeleteMini` and types `Mini`, `CreateMiniDto`, `UpdateMiniDto`. JIT package (raw TS, transpiled by Next).

> External tooling (not in `.docs`): Orval 7 + TanStack Query 5. Config below is the canonical Orval `react-query` + `tags-split` + custom-axios-mutator setup. The generation step (Step 5) requires the API running.

- [ ] **Step 1: Create `packages/queries/package.json`**

```json
{
  "name": "@repo/queries",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "gen:queries": "orval --config ./orval.config.ts",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "axios": "^1.7.0"
  },
  "peerDependencies": {
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "orval": "^7.3.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `packages/queries/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["src", "orval.config.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `packages/queries/src/mutator/custom-axios.ts`**

Single place for the base URL + future interceptors/auth.

```ts
import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

export const customAxios = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-expect-error allow react-query to cancel the request
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
```

- [ ] **Step 4: Create `packages/queries/orval.config.ts`**

```ts
import { defineConfig } from 'orval';

export default defineConfig({
  tallandtiny: {
    input: {
      target: 'http://localhost:3001/api/docs-json',
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/endpoints',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/mutator/custom-axios.ts',
          name: 'customAxios',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

- [ ] **Step 5: Install, then generate hooks (API must be running)**

Run: `pnpm install`

Boot the API in another terminal: `pnpm --filter api start` (Postgres up).

Run: `pnpm --filter @repo/queries gen:queries`
Expected: Orval writes `packages/queries/src/generated/endpoints/minis/minis.ts` (one file per tag) and `packages/queries/src/generated/model/*.ts`. The endpoints file exports `useGetMinis`, `useGetMini`, `useCreateMini`, `useUpdateMini`, `useDeleteMini`.

Verify hook names:
Run: `grep -rho "export const use[A-Za-z]*" packages/queries/src/generated/endpoints | sort -u`
Expected: includes `export const useGetMinis`, `export const useCreateMini`, etc.

- [ ] **Step 6: Create `packages/queries/src/index.ts`** (re-export generated surface)

```ts
export * from './generated/endpoints/minis/minis';
export * from './generated/model';
```

> If `tags-split` nests the file differently (e.g. `endpoints/minis.ts`), adjust the export path to match what Orval actually emitted (confirm with `ls packages/queries/src/generated/endpoints`).

- [ ] **Step 7: Type-check**

Run: `pnpm --filter @repo/queries check-types`
Expected: no type errors.

- [ ] **Step 8: Commit** (generated output IS committed)

```bash
git add packages/queries
git commit -m "feat: add @repo/queries with orval-generated react-query hooks"
```

---

## Task 9: `packages/ui` (shadcn/ui + Tailwind 4)

**Files:**
- Create: `packages/ui/package.json`, `tsconfig.json`, `components.json`, `postcss.config.mjs`, plus shadcn-generated `src/styles/globals.css`, `src/lib/utils.ts`, `src/components/ui/{button,card,input}.tsx`

**Interfaces:**
- Produces: `@repo/ui` exposing `@repo/ui/components/ui/button`, `.../card`, `.../input`, `@repo/ui/lib/utils`, and `@repo/ui/globals.css` (the Tailwind 4 theme). JIT package (raw TSX, transpiled by Next).

> External tooling (not in `.docs` — the Turborepo shadcn guide defers to ui.shadcn.com/docs/monorepo). **Before this task, WebFetch `https://ui.shadcn.com/docs/monorepo`** to confirm current monorepo `components.json` shape and CLI flags, then reconcile with the files below.

- [ ] **Step 1: WebFetch the shadcn monorepo doc**

Fetch `https://ui.shadcn.com/docs/monorepo` and note: where `components.json` lives in the ui package, the alias shape, and the `add` command for targeting a workspace package. Reconcile any differences with Steps 2–4.

- [ ] **Step 2: Create `packages/ui/package.json`**

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./lib/*": "./src/lib/*.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/ui/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@repo/ui/components",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components/ui",
    "lib": "@repo/ui/lib",
    "hooks": "@repo/ui/hooks"
  }
}
```

- [ ] **Step 4: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@repo/ui/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Initialize shadcn + add components**

Run from `packages/ui`: `cd packages/ui && pnpm dlx shadcn@latest init`
When prompted, select the **monorepo** option and accept the `components.json` already present (baseColor neutral, new-york). This generates `src/styles/globals.css` (Tailwind 4 `@import "tailwindcss"` + theme tokens) and `src/lib/utils.ts`.

Run: `pnpm dlx shadcn@latest add button card input`
Expected: creates `src/components/ui/button.tsx`, `card.tsx`, `input.tsx` and installs needed `@radix-ui/*` deps into `packages/ui/package.json`.

> If the CLI cannot infer the monorepo layout, pass `-c packages/ui` from the repo root: `pnpm dlx shadcn@latest add button card input -c packages/ui`. Confirm files land under `packages/ui/src/components/ui/`.

- [ ] **Step 6: Create `packages/ui/postcss.config.mjs`** (if shadcn init didn't add one)

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 7: Install + type-check**

Run: `pnpm install`
Run: `pnpm --filter @repo/ui check-types`
Expected: no type errors. (If `globals.css` imports `tw-animate-css`, ensure it's installed as a dev dep — shadcn adds it.)

- [ ] **Step 8: Commit**

```bash
git add packages/ui
git commit -m "feat: add @repo/ui (shadcn/ui + tailwind 4)"
```

---

## Task 10: `apps/web` (Next.js 16 + TanStack Query + the minis slice)

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts` (auto), `.env.local`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/page.tsx`, `src/app/minis-view.tsx`

**Interfaces:**
- Consumes: `@repo/ui` (components + theme), `@repo/queries` (hooks), the running API.
- Produces: a Next.js app on port 3000 that renders the minis list (`useGetMinis`) and a create form (`useCreateMini` + query invalidation), proving the full pipeline.

> Ref: `.docs/nextjs/01-app/01-getting-started/{01-installation,11-css}.mdx`, `.docs/nextjs/.../transpilePackages.mdx`, `.docs/turborepo/guides/tools/tailwind.mdx`, `.docs/nextjs/01-app/01-getting-started/05-server-and-client-components.mdx`. TanStack Query provider specifics are external; the Next-correct shape is a `"use client"` provider imported into the server layout.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/queries": "workspace:*",
    "@repo/ui": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.17.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/next.config.ts`**

Ref: `.docs/nextjs/.../transpilePackages.mdx`. Listed explicitly for cross-bundler safety even though Turbopack auto-transpiles workspace packages.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui', '@repo/queries'],
};

export default nextConfig;
```

- [ ] **Step 4: Create `apps/web/postcss.config.mjs`**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 5: Create `apps/web/eslint.config.mjs`**

```js
import { nextConfig } from '@repo/eslint-config/next';

export default nextConfig;
```

- [ ] **Step 6: Create `apps/web/.env.local`** (git-ignored)

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

- [ ] **Step 7: Create `apps/web/src/app/globals.css`**

Ref: `.docs/nextjs/01-app/01-getting-started/11-css.mdx` (Tailwind 4). Import Tailwind, import the shared UI theme, and `@source` the UI package so Tailwind scans component classes.

```css
@import 'tailwindcss';
@import '@repo/ui/globals.css';

@source '../../../../packages/ui/src/**/*.{ts,tsx}';
```

> The `@source` path is relative to this CSS file: `apps/web/src/app/` → `../../../../packages/ui/src`. If Tailwind classes from `@repo/ui` don't apply at runtime, fix this path first (verify with `ls` from `apps/web/src/app`).

- [ ] **Step 8: Create `apps/web/src/app/providers.tsx`** (client provider)

Ref: `.docs/nestjs`/Next server-vs-client doc — context providers must be Client Components. Stable `QueryClient` via `useState`.

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 9: Create `apps/web/src/app/layout.tsx`**

Import UI styles then app globals; wrap children with `Providers`.

```tsx
import '@repo/ui/globals.css';
import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Tall & Tiny',
  description: 'A tool for miniature painters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Create `apps/web/src/app/minis-view.tsx`** (client component using the hooks)

Uses generated hooks. Adjust hook/type names if Orval emitted slightly different ones (confirm against `packages/queries/src/generated`).

```tsx
'use client';

import { useGetMinis, useCreateMini } from '@repo/queries';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { useState } from 'react';

export function MinisView() {
  const { data: minis, isLoading, refetch } = useGetMinis();
  const createMini = useCreateMini({
    mutation: {
      onSuccess: () => {
        void refetch();
      },
    },
  });

  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createMini.mutate({
      data: { name, faction: faction || undefined },
    });
    setName('');
    setFaction('');
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 className="text-2xl font-bold">Minis</h1>

      <Card className="p-4 my-4 flex gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Faction (optional)"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={createMini.isPending}>
          Add
        </Button>
      </Card>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {minis?.map((mini) => (
            <li key={mini.id}>
              <Card className="p-3">
                <strong>{mini.name}</strong>
                {mini.faction ? ` — ${mini.faction}` : ''}
                {mini.isPainted ? ' ✅' : ' ⬜'}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 11: Create `apps/web/src/app/page.tsx`** (server component renders the client view)

```tsx
import { MinisView } from './minis-view';

export default function Page() {
  return <MinisView />;
}
```

- [ ] **Step 12: Install + build**

Run: `pnpm install`
Run: `pnpm --filter web build`
Expected: `next build` (Turbopack) compiles with no type errors. (`next-env.d.ts` is auto-created on first run.)

- [ ] **Step 13: End-to-end render check**

Bring up everything: Postgres (Task 4), API (`pnpm --filter api start`), then `pnpm --filter web dev`.

Run: `curl -s http://localhost:3000 | grep -i "Minis"`
Expected: HTML contains the "Minis" heading.

Manual (or via the `verify` skill / browser): load `http://localhost:3000`, confirm the list renders (the mini created in Task 7 appears), add a new mini via the form, and confirm it appears without a full reload (query invalidation/refetch). Confirm shadcn Button/Input/Card are styled (Tailwind applied).

Stop the dev servers.

- [ ] **Step 14: Commit**

```bash
git add apps/web
git commit -m "feat: add Next.js web app with minis vertical slice"
```

---

## Task 11: Full integration verification + Definition of Done

**Files:** none (verification + any small root-script fixes uncovered).

**Interfaces:** confirms the spec's Definition of Done end-to-end.

- [ ] **Step 1: Clean install**

Run: `rm -rf node_modules apps/*/node_modules packages/*/node_modules && pnpm install`
Expected: succeeds with no errors.

- [ ] **Step 2: Infra + DB**

Run: `pnpm docker:up`
Expected: Postgres + MinIO healthy, bucket created.

Run: `pnpm db:deploy` (applies committed migrations) **or** `pnpm db:migrate -- --name init` if starting clean.
Expected: `Mini` table present.

Run: `pnpm db:generate`
Expected: Prisma client generated.

- [ ] **Step 3: Whole-repo build / lint / types**

Run: `pnpm build`
Expected: all packages + apps build; Turbo reports success (DB generate runs before consumers via `dependsOn`).

Run: `pnpm check-types`
Expected: no type errors across the workspace.

Run: `pnpm lint`
Expected: completes (warnings acceptable; no errors).

- [ ] **Step 4: Runtime pipeline**

Boot API (`pnpm --filter api start`) and web (`pnpm --filter web dev`).
- `curl -s http://localhost:3001/api/docs-json | grep -o '"operationId":"[^"]*"' | sort -u` → clean verb operationIds.
- `curl -s http://localhost:3001/api/minis` → JSON array.
- `pnpm gen:queries` (API running) → regenerates `@repo/queries` cleanly (git diff should be empty or only intended changes).
- Load `http://localhost:3000` → minis list + create form work end-to-end.

- [ ] **Step 5: Final commit (if any fixes) + branch finish**

```bash
git add -A
git commit -m "chore: finalize tallandtiny monorepo scaffold"
```

Then invoke the **superpowers:finishing-a-development-branch** skill to choose how to integrate (`scaffold/monorepo` → merge/PR/cleanup).

---

## Self-Review (completed during planning)

- **Spec coverage:** §3 layout → Tasks 1–10; §4 compilation strategy → Task 5 (compiled DB) + Task 10 (transpilePackages); §5 codegen pipeline → Tasks 7–8, 10; §6 clean naming → Task 6 (operationIdFactory) + Task 7 (verb methods, `@ApiTags`, CLI plugin); §7 components → Tasks 2,3,5,6,7,8,9,10; §8 Docker → Task 4; §9 turbo tasks/root scripts → Task 1; §10 versions → Global Constraints + per-package deps; §11 DoD → Task 11. No gaps.
- **Deviations from spec (refinements, all consistent with locked decisions):** (1) Prisma client output lives in `src/generated` (not a separate dir) so the single `tsc` build compiles it for Node consumers — required by the compiled-package decision (§4). (2) Swagger mounted at literal `api/docs` rather than relying on `useGlobalPrefix`, achieving the same `/api/docs` + `/api/docs-json` URLs more robustly. (3) Tailwind theme kept inside `@repo/ui` (no separate `tailwind-config` package) per spec §3 layout. (4) `apps/api` is CommonJS consuming the ESM `@repo/database` via Node ≥22.12 `require(ESM)` — documented as a Global Constraint.
- **Placeholder scan:** none. External-tool steps (shadcn, Orval, ESLint, TanStack) carry concrete config + a verify step + a fallback note.
- **Type consistency:** hook names (`useGetMinis`/`useCreateMini`…), DTO names (`CreateMiniDto`/`UpdateMiniDto`), and the `Mini` entity flow consistently from Task 6/7 → Task 8 → Task 10. Each Orval-dependent step notes "confirm against generated output" since the exact file path/casing is tool-emitted.
