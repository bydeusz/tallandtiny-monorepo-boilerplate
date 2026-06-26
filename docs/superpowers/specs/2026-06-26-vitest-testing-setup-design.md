# Vitest testing setup — design

**Date:** 2026-06-26
**Status:** Approved (brainstorm) — ready for implementation plan
**Topic:** Repo-wide unit/integration testing for the Turborepo, with a shared `@repo/vitest-config` package.

## Goal

Enable a Test-Driven-Development workflow across the whole monorepo with a single,
consistent test runner. Anyone scaffolding a new app/package from this boilerplate
should get a working red → green → refactor loop out of the box.

## Decisions (locked during brainstorm)

| Decision | Choice |
|---|---|
| Test runner | **Vitest everywhere** (migrate the NestJS api off Jest) |
| Test layers in scope | Pure logic/utils, React components & hooks, NestJS service/controller units, DB/integration |
| Shared config shape | **`@repo/vitest-config`** package with presets (mirrors `@repo/eslint-config`) |
| Test file naming | **`*.test.ts(x)`** repo-wide (api migrates from `*.spec.ts`) |
| DB integration depth | **Working example now** — testcontainers Postgres + 1 real Prisma integration test |

## Current state (why this is cheap)

- `apps/api` (NestJS 11): Jest is *configured* but has **0 test files** → migration is essentially free.
- `apps/web`, `apps/dashboard`, `apps/website` (Next.js 16 / React 19): no test setup.
- `packages/auth`, `packages/i18n`, `packages/queries`: already use Vitest with real `*.test.ts` files
  and their own `vitest.config.ts` → de-facto standard, will be refactored onto the presets.
- `packages/ui` (React components), `packages/database` (Prisma): no tests yet.
- No `turbo run test` task and no root `test` script → tests don't run centrally or cached today.

## Architecture

One new package `packages/vitest-config` (`@repo/vitest-config`), modelled on `@repo/eslint-config`.
It exports preset factory functions; every consuming app/package has a tiny `vitest.config.ts`:

```ts
// packages/ui/vitest.config.ts — the whole file
import { react } from "@repo/vitest-config/react";
export default react();
```

Presets are **functions** so a package can extend via `mergeConfig`:

```ts
import { react } from "@repo/vitest-config/react";
export default react({ setupFiles: ["./test/next-mocks.ts"] });
```

All shared test dependencies live in `@repo/vitest-config` (declared as regular `dependencies`),
so consumers get them transitively — no per-package duplication.

### Package layout

```
packages/vitest-config/
  package.json          # exports ./node ./react ./nest ./integration ; bundles shared deps
  src/
    base.ts             # shared defaults (coverage v8, include **/*.test.ts(x), reporters)
    node.ts             # node() preset
    react.ts            # react() preset (jsdom + @vitejs/plugin-react)
    nest.ts             # nest() preset (unplugin-swc + vite-tsconfig-paths)
    integration.ts      # integration() preset (testcontainers globalSetup)
  setup/
    react.ts            # imports @testing-library/jest-dom/vitest; afterEach(cleanup)
    nest.ts             # imports reflect-metadata
  globalSetup/
    postgres.ts         # spins up testcontainers Postgres, runs prisma migrate deploy, sets DATABASE_URL
```

### Exports (`package.json`)

```json
{
  "name": "@repo/vitest-config",
  "exports": {
    "./node": "./src/node.ts",
    "./react": "./src/react.ts",
    "./nest": "./src/nest.ts",
    "./integration": "./src/integration.ts"
  }
}
```

## The four presets

### `node` — `@repo/vitest-config/node`
- `environment: 'node'`, `globals: true`, v8 coverage, `include: ['**/*.test.ts']`.
- For: pure logic, helpers, mutators, framework-free services.
- Consumers: `packages/queries`, logic in `packages/auth`.

### `react` — `@repo/vitest-config/react`
- `environment: 'jsdom'`, `@vitejs/plugin-react`, `setupFiles: [setup/react.ts]`.
- Setup file: `import '@testing-library/jest-dom/vitest'` + `afterEach(cleanup)`.
- For: React components & hooks.
- Consumers: `packages/ui`, `packages/auth`, `packages/i18n`, and the Next.js apps
  (`web`, `dashboard`, `website`). Next-specific mocks (`next/navigation`, `next-intl`) go in a
  per-app setup file passed to `react({ setupFiles: [...] })`.

### `nest` — `@repo/vitest-config/nest`
- `environment: 'node'`, `plugins: [swc.vite(), tsconfigPaths()]`, `setupFiles: [setup/nest.ts]`.
- `unplugin-swc` + `@swc/core` provide `emitDecoratorMetadata` (Vitest's default esbuild/OXC
  transformer does NOT emit decorator metadata, which NestJS DI requires).
- Setup file imports `reflect-metadata`.
- For: NestJS service/controller unit tests with `@nestjs/testing` and mocked dependencies (no DB).
- Consumer: `apps/api`.

### `integration` — `@repo/vitest-config/integration`
- `environment: 'node'`, longer `testTimeout`/`hookTimeout`, `globalSetup: [globalSetup/postgres.ts]`.
- `globalSetup/postgres.ts`: starts a `@testcontainers/postgresql` container, sets `DATABASE_URL`,
  runs `prisma migrate deploy`, tears down after the suite. Requires Docker (local + CI).
- For: real Prisma queries against a throwaway Postgres.
- Consumer: `apps/api` (and/or `packages/database`) via a separate `test:integration` task.

## Turbo wiring (`turbo.json`)

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
  "dependsOn": ["^db:generate"],
  "cache": false
}
```

Root `package.json` scripts:

```json
"test": "turbo run test",
"test:watch": "turbo run test:watch",
"test:integration": "turbo run test:integration"
```

- `test` is cacheable and `--affected`-aware (only changed packages re-run).
- `test:watch` is the TDD loop (persistent, not cached).
- `test:integration` is separate so the fast unit suite stays fast; not cached (Docker-dependent).

## Migration: NestJS api (Jest → Vitest)

1. Remove the `jest` config block and `jest`, `ts-jest`, `@types/jest` devDeps from `apps/api/package.json`.
2. Add `apps/api/vitest.config.ts` using the `nest()` preset.
3. `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:integration": "vitest run --config vitest.integration.config.ts"`.
4. Keep `@nestjs/testing` (and `supertest` for e2e if used) — both work under Vitest.
5. No existing `*.spec.ts` files to convert (there are none).

## Existing packages cleanup

- `auth`, `i18n`, `queries`: replace their hand-written `vitest.config.ts` with the matching preset
  (one line) and swap their standalone `vitest` devDep for `@repo/vitest-config`.
- `ui`, `database`: add new `vitest.config.ts` + a `test` script.
- Existing tests already use `*.test.ts`, so no renames needed there.

## Seed tests (TDD foundation)

Ship one example per preset so the boilerplate is genuinely TDD-ready and demonstrates the pattern:

- **node**: keep/showcase an existing `packages/queries` test (e.g. `envelope.test.ts`).
- **react**: a `packages/ui` component test (e.g. `Button` renders + handles click) using Testing Library.
- **nest**: an `apps/api` service test with a mocked dependency via `Test.createTestingModule`.
- **integration**: one real Prisma test in `apps/api` (or `packages/database`) that creates and reads
  a row against the testcontainers Postgres.

## Out of scope (YAGNI for now)

- E2E/browser tests (Playwright) — `test:e2e` can be added later; not part of this work.
- Mutation testing, visual regression, coverage gates/thresholds in CI (can be layered on later).
- CI pipeline changes beyond making the tasks runnable (wiring into a CI provider is separate).

## Risks / notes

- **Decorators under Vitest** are the main technical risk; mitigated by the `unplugin-swc` recipe in the
  `nest` preset. If the repo later moves to Rolldown/Vite 8 (OXC), the swc plugin or a babel decorator
  plugin remains the path — keep the transform concern inside the preset.
- **Docker requirement** for `test:integration`; the fast `test` task must never depend on it.
- **React 19 + Next.js**: component tests may need `next/navigation` / `next-intl` mocks per app; handled
  via per-app setup files layered on the `react` preset.
