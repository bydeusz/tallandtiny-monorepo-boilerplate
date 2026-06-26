import { defineConfig } from "vitest/config";

/** Glob patterns for unit test files (shared by node/react/nest presets). */
export const unitInclude = [
  "src/**/*.test.{ts,tsx}",
  "test/**/*.test.{ts,tsx}",
];

/** Paths never collected as unit tests. Integration and e2e tests are excluded here. */
export const unitExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/*.integration.test.*",
  "**/*.e2e.test.*",
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
