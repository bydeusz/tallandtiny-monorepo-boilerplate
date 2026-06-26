# Vitest Testing Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Turborepo a single, consistent Vitest-based testing setup with a shared `@repo/vitest-config` package, so every app/package gets a working TDD loop (unit + integration) out of the box.

**Architecture:** A new internal package `@repo/vitest-config` exports four preset factory functions (`node`, `react`, `nest`, `integration`), modelled on `@repo/eslint-config`. Each app/package keeps a tiny `vitest.config.ts` that imports a preset. Config-time plugins (swc, plugin-react, tsconfig-paths, testcontainers, jest-dom matchers) live in the config package; libraries imported by test files (jsdom, @testing-library/*) are direct devDeps of each consumer. Turbo tasks `test`, `test:watch`, `test:integration` orchestrate runs with caching.

**Tech Stack:** Vitest 4, pnpm workspaces, Turborepo, `@vitejs/plugin-react` + Testing Library (React), `unplugin-swc` + `@swc/core` + `vite-tsconfig-paths` (NestJS decorators), `@testcontainers/postgresql` + Prisma 7 (integration).

## Global Constraints

- Node `>=22.12`; package manager `pnpm@10.28.2`. One line each, copied from the spec.
- Test runner: **Vitest** (`^4.1.9`) everywhere. No Jest.
- Unit test files are named `*.test.ts` / `*.test.tsx`. Integration test files are named `*.integration.test.ts`.
- All `@repo/*` packages are ESM (`"type": "module"`) and ship TypeScript source via `exports` (no build step), EXCEPT `@repo/database` which ships `dist/`.
- Follow the existing config-package pattern: subpath `exports`, `private: true`, `version: "0.0.0"`.
- `test:integration` requires Docker (testcontainers). The fast `test` task must never depend on Docker.

---

### Task 1: Create `@repo/vitest-config` with `base` + `node` preset, adopt in `queries`/`auth`/`i18n`

**Files:**
- Create: `packages/vitest-config/package.json`
- Create: `packages/vitest-config/tsconfig.json`
- Create: `packages/vitest-config/src/base.ts`
- Create: `packages/vitest-config/src/node.ts`
- Modify: `packages/queries/vitest.config.ts` (replace contents)
- Modify: `packages/queries/package.json` (add devDep)
- Modify: `packages/auth/vitest.config.ts` (replace contents)
- Modify: `packages/auth/package.json` (add devDep)
- Modify: `packages/i18n/vitest.config.ts` (replace contents)
- Modify: `packages/i18n/package.json` (add devDep)

**Interfaces:**
- Produces: `@repo/vitest-config/node` → `node(overrides?: ViteUserConfig) => ViteUserConfig` (node env, `globals: true`, includes `src/**/*.test.{ts,tsx}` and `test/**/*.test.{ts,tsx}`, excludes `**/*.integration.test.*`).
- Produces (internal, for later tasks): `packages/vitest-config/src/base.ts` exports `baseConfig`, `unitInclude`, `unitExclude`.

- [ ] **Step 1: Create the package skeleton**

Create `packages/vitest-config/package.json`:

```json
{
  "name": "@repo/vitest-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./node": "./src/node.ts",
    "./react": "./src/react.ts",
    "./nest": "./src/nest.ts",
    "./integration": "./src/integration.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "peerDependencies": {
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Register the package in the workspace and add dev dependencies**

Run:

```bash
pnpm install
pnpm --filter @repo/vitest-config add -D vitest @repo/typescript-config @types/node typescript
```

Expected: pnpm resolves versions and writes them into `packages/vitest-config/package.json` `devDependencies`. `@repo/typescript-config` is added as `workspace:*`.

- [ ] **Step 3: Create the base config**

Create `packages/vitest-config/src/base.ts`:

```ts
import { defineConfig } from "vitest/config";

/** Glob patterns for unit test files (shared by node/react/nest presets). */
export const unitInclude = [
  "src/**/*.test.{ts,tsx}",
  "test/**/*.test.{ts,tsx}",
];

/** Paths never collected as unit tests. Integration tests are excluded here. */
export const unitExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/*.integration.test.*",
];

/** Defaults shared by every preset. Coverage is configured but only loaded
 *  when a run passes `--coverage` (then `@vitest/coverage-v8` must be installed). */
export const baseConfig = defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**"],
    },
  },
});
```

- [ ] **Step 4: Create the node preset**

Create `packages/vitest-config/src/node.ts`:

```ts
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base";

/** Node environment preset: pure logic, helpers, framework-free services. */
export function node(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    mergeConfig(
      baseConfig,
      defineConfig({
        test: {
          environment: "node",
          include: unitInclude,
          exclude: unitExclude,
        },
      }),
    ),
    overrides,
  );
}
```

- [ ] **Step 5: Create the package tsconfig**

Create `packages/vitest-config/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "setup", "globalSetup"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Point `queries` at the node preset**

Replace the entire contents of `packages/queries/vitest.config.ts` with:

```ts
import { node } from "@repo/vitest-config/node";

export default node();
```

Add the dependency:

```bash
pnpm --filter @repo/queries add -D @repo/vitest-config
```

- [ ] **Step 7: Run the existing `queries` tests to verify the preset works**

Run: `pnpm --filter @repo/queries test`
Expected: PASS — the 4 existing tests run green (`auth-token-store`, `custom-axios`, `envelope`, `api-error`). This proves `@repo/vitest-config/node` resolves and behaves like the old hand-written config.

- [ ] **Step 8: Point `auth` and `i18n` at the node preset**

Replace the entire contents of `packages/auth/vitest.config.ts` with:

```ts
import { node } from "@repo/vitest-config/node";

export default node();
```

Replace the entire contents of `packages/i18n/vitest.config.ts` with:

```ts
import { node } from "@repo/vitest-config/node";

export default node();
```

Add the dependency to both:

```bash
pnpm --filter @repo/auth add -D @repo/vitest-config
pnpm --filter @repo/i18n add -D @repo/vitest-config
```

- [ ] **Step 9: Run `auth` and `i18n` tests to verify**

Run: `pnpm --filter @repo/auth test && pnpm --filter @repo/i18n test`
Expected: PASS — `auth/src/server.test.ts`, `i18n/src/messages.test.ts`, `i18n/src/locales.test.ts` all green.

- [ ] **Step 10: Commit**

```bash
git add packages/vitest-config packages/queries packages/auth packages/i18n pnpm-lock.yaml
git commit -m "feat(vitest-config): add shared config package with node preset"
```

---

### Task 2: Wire the Turbo `test` task and root scripts

**Files:**
- Modify: `turbo.json` (add `test` and `test:watch` tasks)
- Modify: `package.json` (root — add `test` and `test:watch` scripts)

**Interfaces:**
- Consumes: the `test` script in `queries`/`auth`/`i18n` (`vitest run`) from Task 1.
- Produces: root `pnpm test` running `turbo run test` across all packages that define a `test` script; `pnpm test:watch` for the TDD loop.

- [ ] **Step 1: Add the test tasks to `turbo.json`**

In `turbo.json`, inside `"tasks"`, add these three entries (place them after the `"lint"` entry):

```jsonc
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["coverage/**"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "test:integration": {
      "dependsOn": ["^build", "^db:generate"],
      "cache": false
    },
```

(The `test:integration` task is wired here so it exists; its consumers arrive in Task 5.)

- [ ] **Step 2: Add root scripts**

In the root `package.json` `"scripts"`, add after `"check-types"`:

```json
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:integration": "turbo run test:integration",
```

- [ ] **Step 3: Run the full unit suite via Turbo**

Run: `pnpm test`
Expected: PASS — Turbo runs `test` in `@repo/queries`, `@repo/auth`, `@repo/i18n` (the packages with a `test` script today). All green. A second `pnpm test` with no changes prints `>>> FULL TURBO` (cache hit).

- [ ] **Step 4: Commit**

```bash
git add turbo.json package.json
git commit -m "feat(turbo): add test, test:watch, test:integration tasks"
```

---

### Task 3: Add the `react` preset and seed `packages/ui` tests

**Files:**
- Create: `packages/vitest-config/setup/react.js`
- Create: `packages/vitest-config/src/react.ts`
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/lib/utils.test.ts`
- Create: `packages/ui/src/hooks/use-date-formatter.test.tsx`
- Modify: `packages/ui/package.json` (add `test`/`test:watch` scripts + devDeps)

**Interfaces:**
- Consumes: `baseConfig`, `unitInclude`, `unitExclude` from `src/base.ts` (Task 1).
- Produces: `@repo/vitest-config/react` → `react(overrides?: ViteUserConfig) => ViteUserConfig` (jsdom env, `@vitejs/plugin-react`, jest-dom matchers via setup file). Pass per-app setup via `react({ setupFiles: [...] })`.

- [ ] **Step 1: Write the failing tests first**

Create `packages/ui/src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges classes and resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
```

Create `packages/ui/src/hooks/use-date-formatter.test.tsx`:

```tsx
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDateFormatter } from "./use-date-formatter";

describe("useDateFormatter", () => {
  it("formats a local date string as DD-MM-YYYY", () => {
    // No trailing "Z" → parsed in local time, so the day is timezone-stable.
    const { result } = renderHook(() => useDateFormatter("2024-03-09T12:00:00"));
    expect(result.current).toBe("09-03-2024");
  });
});
```

- [ ] **Step 2: Add the ui test config, scripts, and dependencies**

Create `packages/ui/vitest.config.ts`:

```ts
import { react } from "@repo/vitest-config/react";

export default react();
```

In `packages/ui/package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

Install the runner + the libraries the test files import:

```bash
pnpm --filter @repo/ui add -D vitest @repo/vitest-config jsdom @testing-library/react @testing-library/user-event
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @repo/ui test`
Expected: FAIL — `Failed to load url @repo/vitest-config/react` (the `react` preset does not exist yet). This confirms the tests are wired and the preset is the missing piece.

- [ ] **Step 4: Add the react setup file and preset**

Create `packages/vitest-config/setup/react.js` (plain ESM — only a side-effect import, so it needs no transform):

```js
// Registers jest-dom matchers (toBeInTheDocument, etc.) on Vitest's expect.
// @testing-library/react auto-runs cleanup() after each test when globals:true.
import "@testing-library/jest-dom/vitest";
```

Add the config-time dependencies to the config package:

```bash
pnpm --filter @repo/vitest-config add @vitejs/plugin-react @testing-library/jest-dom
```

Create `packages/vitest-config/src/react.ts`:

```ts
import { fileURLToPath } from "node:url";
import reactPlugin from "@vitejs/plugin-react";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base";

const setupFile = fileURLToPath(new URL("../setup/react.js", import.meta.url));

/** jsdom + React preset: components and hooks. */
export function react(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    mergeConfig(
      baseConfig,
      defineConfig({
        plugins: [reactPlugin()],
        test: {
          environment: "jsdom",
          include: unitInclude,
          exclude: unitExclude,
          setupFiles: [setupFile],
        },
      }),
    ),
    overrides,
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @repo/ui test`
Expected: PASS — both `cn` and `useDateFormatter` tests green, running under the jsdom environment.

- [ ] **Step 6: Commit**

```bash
git add packages/vitest-config packages/ui pnpm-lock.yaml
git commit -m "feat(vitest-config): add react preset; seed packages/ui tests"
```

---

### Task 4: Add the `nest` preset and migrate `apps/api` from Jest to Vitest

**Files:**
- Create: `packages/vitest-config/setup/nest.js`
- Create: `packages/vitest-config/src/nest.ts`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config/configuration.test.ts`
- Modify: `apps/api/package.json` (remove jest block + jest devDeps; add vitest scripts + devDeps)

**Interfaces:**
- Consumes: `baseConfig`, `unitInclude`, `unitExclude` from `src/base.ts` (Task 1).
- Produces: `@repo/vitest-config/nest` → `nest(overrides?: ViteUserConfig) => ViteUserConfig` (node env, `unplugin-swc` for decorator metadata, `vite-tsconfig-paths`, `reflect-metadata` via setup file).

- [ ] **Step 1: Write the failing test first**

Create `apps/api/src/config/configuration.test.ts`:

```ts
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import configuration from "./configuration";

describe("configuration via Nest ConfigService", () => {
  beforeEach(() => {
    process.env.PORT = "4567";
  });

  it("exposes the http port through the DI container", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [configuration], ignoreEnvFile: true }),
      ],
    }).compile();

    const config = moduleRef.get(ConfigService);
    expect(config.get<number>("port")).toBe(4567);
  });
});
```

This test exercises NestJS DI and decorator metadata (`@Injectable` `ConfigService`), which is exactly what the swc transform must enable.

- [ ] **Step 2: Migrate `apps/api/package.json` to Vitest**

In `apps/api/package.json`:

1. Delete the entire top-level `"jest"` config block.
2. In `"scripts"`, replace the `"test"` and `"test:e2e"` lines with:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

3. From `"devDependencies"`, remove `jest`, `ts-jest`, `@types/jest`, and `supertest` is kept for future e2e (leave `@types/supertest` and `supertest`).

Then install the runner + config package:

```bash
pnpm --filter api add -D vitest @repo/vitest-config
```

- [ ] **Step 3: Add the api vitest config**

Create `apps/api/vitest.config.ts`:

```ts
import { nest } from "@repo/vitest-config/nest";

export default nest();
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter api test`
Expected: FAIL — `Failed to load url @repo/vitest-config/nest` (preset not created yet).

- [ ] **Step 5: Add the nest setup file and preset**

Create `packages/vitest-config/setup/nest.js` (plain ESM side-effect import):

```js
// NestJS dependency injection relies on decorator metadata at runtime.
import "reflect-metadata";
```

Add the config-time dependencies:

```bash
pnpm --filter @repo/vitest-config add unplugin-swc @swc/core vite-tsconfig-paths reflect-metadata
```

Create `packages/vitest-config/src/nest.ts`:

```ts
import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base";

const setupFile = fileURLToPath(new URL("../setup/nest.js", import.meta.url));

/** NestJS preset: node env + swc so `emitDecoratorMetadata` works (Vitest's
 *  default esbuild/OXC transformer does not emit decorator metadata). */
export function nest(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    mergeConfig(
      baseConfig,
      defineConfig({
        plugins: [
          tsconfigPaths(),
          swc.vite({
            jsc: {
              target: "es2021",
              parser: { syntax: "typescript", decorators: true },
              transform: { legacyDecorator: true, decoratorMetadata: true },
            },
          }),
        ],
        test: {
          environment: "node",
          include: unitInclude,
          exclude: unitExclude,
          setupFiles: [setupFile],
        },
      }),
    ),
    overrides,
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter api test`
Expected: PASS — `configuration.test.ts` green. If it fails with a metadata/`Reflect` error, confirm `@swc/core` installed and the `transform.decoratorMetadata` flag is present.

- [ ] **Step 7: Commit**

```bash
git add packages/vitest-config apps/api pnpm-lock.yaml
git commit -m "feat(api): migrate from Jest to Vitest via nest preset"
```

---

### Task 5: Add the `integration` preset (testcontainers + Prisma) and seed an api integration test

**Files:**
- Create: `packages/vitest-config/globalSetup/postgres.js`
- Create: `packages/vitest-config/src/integration.ts`
- Create: `apps/api/vitest.integration.config.ts`
- Create: `apps/api/test/user.integration.test.ts`
- Modify: `apps/api/package.json` (add `test:integration` script)

**Interfaces:**
- Consumes: `baseConfig` from `src/base.ts` (Task 1); `@repo/database` `prisma` client; `prisma.config.ts` resolving `DATABASE_URL` from env.
- Produces: `@repo/vitest-config/integration` → `integration(overrides?: ViteUserConfig) => ViteUserConfig` (node env, `globalSetup` spins up a throwaway Postgres + runs `prisma migrate deploy`, includes only `**/*.integration.test.ts`, single fork, long timeouts).

- [ ] **Step 1: Write the failing test first**

Create `apps/api/test/user.integration.test.ts`:

```ts
import { prisma } from "@repo/database";
import { afterAll, describe, expect, it } from "vitest";

describe("User persistence (integration)", () => {
  it("creates and reads back a user", async () => {
    const created = await prisma.user.create({
      data: {
        name: "Ada",
        surname: "Lovelace",
        email: `ada-${Date.now()}@example.com`,
        password: "hashed-password",
      },
    });

    const found = await prisma.user.findUnique({ where: { id: created.id } });

    expect(found?.email).toBe(created.email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 2: Add the integration config and script**

Create `apps/api/vitest.integration.config.ts`:

```ts
import { integration } from "@repo/vitest-config/integration";

export default integration();
```

In `apps/api/package.json` `"scripts"`, add:

```json
    "test:integration": "vitest run --config vitest.integration.config.ts",
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter api test:integration`
Expected: FAIL — `Failed to load url @repo/vitest-config/integration` (preset not created yet).

- [ ] **Step 4: Add the integration global setup and preset**

Create `packages/vitest-config/globalSetup/postgres.js` (plain ESM):

```js
import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();

  // Worker processes are forked after globalSetup, inheriting this env var.
  process.env.DATABASE_URL = url;

  // Apply migrations to the throwaway database. prisma.config.ts reads
  // DATABASE_URL from env, and dotenv does not override an already-set var.
  execSync("pnpm --filter @repo/database run db:deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

export async function teardown() {
  await container?.stop();
}
```

Add the config-time dependencies:

```bash
pnpm --filter @repo/vitest-config add testcontainers @testcontainers/postgresql
```

Create `packages/vitest-config/src/integration.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig } from "./base";

const globalSetupFile = fileURLToPath(
  new URL("../globalSetup/postgres.js", import.meta.url),
);

/** Integration preset: real Postgres via testcontainers + Prisma migrations.
 *  Single fork so all integration tests share one container and DB state. */
export function integration(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    mergeConfig(
      baseConfig,
      defineConfig({
        test: {
          environment: "node",
          include: ["**/*.integration.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**"],
          globalSetup: [globalSetupFile],
          testTimeout: 60_000,
          hookTimeout: 120_000,
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
      }),
    ),
    overrides,
  );
}
```

- [ ] **Step 5: Ensure the Prisma client is generated and Docker is running**

Run:

```bash
docker info > /dev/null 2>&1 && echo "docker ok" || echo "START DOCKER FIRST"
pnpm --filter @repo/database run db:generate
pnpm --filter @repo/database run build
```

Expected: `docker ok`, then Prisma generates its client and `@repo/database` builds its `dist/`.

- [ ] **Step 6: Run the integration test to verify it passes**

Run: `pnpm --filter api test:integration`
Expected: PASS — testcontainers pulls/starts `postgres:16-alpine`, `prisma migrate deploy` applies the two migrations, the test creates and reads a `User`, then the container stops. First run is slow (image pull); later runs are faster.

- [ ] **Step 7: Commit**

```bash
git add packages/vitest-config apps/api pnpm-lock.yaml
git commit -m "feat(api): add testcontainers Postgres integration preset + seed test"
```

---

### Task 6: Document the testing setup and run the full verification

**Files:**
- Create: `docs/testing.md`
- Modify: `README.md` (link to the testing doc)

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: developer-facing docs and a green end-to-end run.

- [ ] **Step 1: Write the testing doc**

Create `docs/testing.md`:

```markdown
# Testing

This repo uses **Vitest** everywhere, configured through the shared
`@repo/vitest-config` package.

## Commands

- `pnpm test` — run all unit tests (Turbo-cached, `--affected`-aware).
- `pnpm test:watch` — watch mode for the TDD loop.
- `pnpm test:integration` — run integration tests (requires Docker).
- `pnpm --filter <pkg> test` — run one package's tests.

## Presets

Every package/app has a small `vitest.config.ts` importing one preset:

| Preset | Import | Use for |
| --- | --- | --- |
| `node` | `@repo/vitest-config/node` | pure logic, helpers, mutators |
| `react` | `@repo/vitest-config/react` | React components & hooks (jsdom + Testing Library) |
| `nest` | `@repo/vitest-config/nest` | NestJS services/controllers (decorators via swc) |
| `integration` | `@repo/vitest-config/integration` | real Postgres (testcontainers) + Prisma |

Extend a preset per package: `export default react({ setupFiles: ["./test/setup.ts"] })`.

## File naming

- Unit tests: `*.test.ts` / `*.test.tsx`.
- Integration tests: `*.integration.test.ts` (run only by `pnpm test:integration`).

## Coverage

Run `pnpm --filter <pkg> exec vitest run --coverage` after installing
`@vitest/coverage-v8` in that package.
```

- [ ] **Step 2: Link the doc from the README**

In `README.md`, add a line under the project description:

```markdown
See [docs/testing.md](docs/testing.md) for the testing setup (Vitest + `@repo/vitest-config`).
```

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test`
Expected: PASS — `queries`, `auth`, `i18n`, `ui`, `api` all green via Turbo.

- [ ] **Step 4: Run type-checking on the new config package**

Run: `pnpm --filter @repo/vitest-config check-types`
Expected: PASS — no type errors in the presets.

- [ ] **Step 5: Run the integration suite (Docker required)**

Run: `pnpm test:integration`
Expected: PASS — the api integration test runs against a throwaway Postgres.

- [ ] **Step 6: Commit**

```bash
git add docs/testing.md README.md
git commit -m "docs: document Vitest testing setup"
```

---

## Self-Review

**Spec coverage:**
- Vitest everywhere → Tasks 1–5 (api migrated off Jest in Task 4). ✓
- `@repo/vitest-config` package with `node`/`react`/`nest`/`integration` presets → Tasks 1, 3, 4, 5. ✓
- Pure logic layer → `node` preset + queries/auth/i18n (Task 1). ✓
- React components & hooks → `react` preset + ui seed tests (Task 3). ✓
- NestJS units → `nest` preset + api configuration test (Task 4). ✓
- DB/integration with working example → `integration` preset + testcontainers + User test (Task 5). ✓
- Turbo `test` / `test:watch` / `test:integration` + root scripts → Task 2 (tasks) and Tasks 4–5 (scripts). ✓
- `*.test.ts(x)` naming + `*.integration.test.ts` for integration → enforced in base/integration includes. ✓
- Existing Vitest configs reduced to one line → Task 1 (queries/auth/i18n). ✓
- Seed tests per preset → Tasks 1 (node, existing), 3 (react), 4 (nest), 5 (integration). ✓
- Out of scope (e2e/browser, coverage gates, CI wiring) → not included, matching the spec. ✓

**Placeholder scan:** No TBD/TODO; every code and command step contains concrete content.

**Type consistency:** Preset function names (`node`, `react`, `nest`, `integration`) and shared exports (`baseConfig`, `unitInclude`, `unitExclude`) are used identically across tasks. Setup/globalSetup files are plain `.js` (side-effect/logic only) to avoid node_modules transform issues; presets reference them via `fileURLToPath(new URL(...))`.

## Risk notes for the implementer

- **Decorator metadata:** if the nest test fails with a `Reflect.getMetadata`/DI resolution error, verify `@swc/core` is installed and `transform.decoratorMetadata: true` is set in `src/nest.ts`.
- **Docker:** `test:integration` needs a running Docker daemon; Step 5 of Task 5 checks this first.
- **Env propagation:** the integration preset uses `singleFork` so the worker reliably inherits `DATABASE_URL` set by `globalSetup`. Do not remove it without re-verifying.
- **Vite/plugin versions:** `pnpm add` resolves current versions; if `@vitejs/plugin-react` or `unplugin-swc` warns about a Vite peer mismatch with Vitest 4, pin to the version matching Vitest's bundled Vite.
