import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base.ts";

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
