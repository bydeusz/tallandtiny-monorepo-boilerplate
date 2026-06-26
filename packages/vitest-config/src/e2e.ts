import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig } from "./base.ts";

const globalSetupFile = fileURLToPath(
  new URL("../globalSetup/e2e.js", import.meta.url),
);

/** E2e preset: real Postgres + Redis via testcontainers, DB seed, spawns built server.
 *  Single fork so globalSetup env mutations are inherited by the test process. */
export function e2e(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    mergeConfig(
      baseConfig,
      defineConfig({
        test: {
          environment: "node",
          include: ["**/*.e2e.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**"],
          globalSetup: [globalSetupFile],
          testTimeout: 60_000,
          hookTimeout: 120_000,
          pool: "forks",
          maxWorkers: 1,
          isolate: false,
        },
      }),
    ),
    overrides,
  );
}
