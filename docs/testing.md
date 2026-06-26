# Testing

This repo uses **Vitest** everywhere, configured through the shared
`@repo/vitest-config` package.

## Commands

- `pnpm test` — run all unit tests (Turbo-cached, `--affected`-aware).
- `pnpm test:watch` — watch mode for the TDD loop.
- `pnpm test:integration` — run integration tests (requires Docker).
- `pnpm test:e2e` — run e2e tests (requires Docker + api must be built; turbo handles build dep).
- `pnpm --filter <pkg> test` — run one package's tests.

## Presets

Every package/app has a small `vitest.config.ts` importing one preset:

| Preset | Import | Use for |
| --- | --- | --- |
| `node` | `@repo/vitest-config/node` | pure logic, helpers, mutators |
| `react` | `@repo/vitest-config/react` | React components & hooks (jsdom + Testing Library) |
| `nest` | `@repo/vitest-config/nest` | NestJS services/controllers (decorators via swc) |
| `integration` | `@repo/vitest-config/integration` | real Postgres (testcontainers) + Prisma |
| `e2e` | `@repo/vitest-config/e2e` | real Postgres + Redis (testcontainers), seeds DB, spawns built server, HTTP smoke test |

Extend a preset per package: `export default react({ setupFiles: ["./test/setup.ts"] })`.

## File naming

- Unit tests: `*.test.ts` / `*.test.tsx`.
- Integration tests: `*.integration.test.ts` (run only by `pnpm test:integration`).
- E2e tests: `*.e2e.test.ts` (run only by `pnpm test:e2e`).

> **Note:** E2e tests require Docker. The `turbo.json` `test:e2e` task depends on `build`, so `dist/main.js` is guaranteed before the test runs.

## Coverage

Run `pnpm --filter <pkg> exec vitest run --coverage` after installing
`@vitest/coverage-v8` in that package.
