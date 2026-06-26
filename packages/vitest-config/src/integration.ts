import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig } from "./base.ts";

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
          // One shared fork (pool:forks + maxWorkers:1) with no isolation, so
          // globalSetup's DATABASE_URL env mutation is inherited and all
          // integration tests reuse the same container/DB.
          pool: "forks",
          maxWorkers: 1,
          isolate: false,
        },
      }),
    ),
    overrides,
  );
}
