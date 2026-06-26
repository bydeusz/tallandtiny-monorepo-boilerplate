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
