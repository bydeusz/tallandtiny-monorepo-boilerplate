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
          // Vitest 4: singleFork replaced by maxWorkers:1 + isolate:false.
          // pool:"forks" is stated explicitly so a future default change
          // cannot silently break process.env.DATABASE_URL inheritance.
          pool: "forks",
          maxWorkers: 1,
          isolate: false,
        },
      }),
    ),
    overrides,
  );
}
