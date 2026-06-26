import { baseConfig } from "@repo/eslint-config/base";

/**
 * @repo/ui lint config.
 *
 * Enforces the atomic-design dependency direction with `no-restricted-imports`,
 * scoped per layer. Allowed direction is downward only:
 *
 *   organisms ──▶ molecules ──▶ atoms
 *
 * i.e. a higher layer may use lower layers, never the other way around.
 * (`lib/` and `hooks/` are not layers and may be imported by anyone.)
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    // Tooling scripts/config run in Node, not the browser.
    files: ["scripts/**/*.{js,mjs}", "turbo/**/*.{ts,js}", "*.config.{js,mjs,ts}"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
  },
  {
    // shadcn primitives use `interface Props extends X {}` as a named alias —
    // allow that, but still flag genuinely empty `{}` object types.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
    },
  },
  {
    files: ["src/atoms/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@repo/ui/molecules",
                "@repo/ui/molecules/*",
                "@repo/ui/organisms",
                "@repo/ui/organisms/*",
                "**/molecules/**",
                "**/organisms/**",
              ],
              message:
                "Atomic-design rule: an atom must not import molecules or organisms (direction is organisms → molecules → atoms). Move shared logic down a layer or lift this component up.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/molecules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@repo/ui/organisms", "@repo/ui/organisms/*", "**/organisms/**"],
              message:
                "Atomic-design rule: a molecule must not import organisms (direction is organisms → molecules → atoms).",
            },
          ],
        },
      ],
    },
  },
];
