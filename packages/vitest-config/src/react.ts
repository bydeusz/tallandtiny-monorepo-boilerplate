import { fileURLToPath } from "node:url";
import reactPlugin from "@vitejs/plugin-react";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base.ts";

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
