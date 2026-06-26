import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import { baseConfig, unitExclude, unitInclude } from "./base.ts";

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
