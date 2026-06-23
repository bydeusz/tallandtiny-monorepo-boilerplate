# shadcn Per-App Config — Design

**Date:** 2026-06-23
**Status:** Approved
**Author:** Tadeusz de Ruijter (with Claude)

## 1. Purpose

Make the shadcn/ui CLI usable from each frontend app (`apps/web`, `apps/dashboard`,
`apps/website`) by giving each app its own `components.json`, following the official
shadcn + Turborepo monorepo pattern.

shadcn is **already installed** at the shared-package level: `packages/ui` has a
`components.json` (style `new-york`, baseColor `neutral`, RSC, lucide) plus `button`,
`card`, and `input`. What is missing is per-app configuration, so today the CLI cannot be
targeted at an individual app (`shadcn add <component> -c apps/<app>`). This slice adds that.

The chosen model is **shared primitives + app-local composition**: shadcn UI primitives
(`button`, `dialog`, …) land in the shared `@repo/ui` package; app-specific or composed
components live locally in each app under `@/`.

## 1a. Requirements (confirmed with user)

| Requirement | How the design satisfies it |
|---|---|
| General components (button, input, **modal**, **notifications**) shared across all apps | They live in `@repo/ui` and are imported as `@repo/ui/components/ui/<name>`. `button`/`input` already exist; **modal** = shadcn `dialog`, **notifications** = shadcn `sonner` — added later by the user via `shadcn add … -c apps/<app>`, landing in `@repo/ui` because the app configs alias `ui`/`utils` to the shared package. |
| One shared style across all apps | A single theme in `packages/ui/src/styles/globals.css` (new-york, baseColor neutral, light/dark tokens). Every app imports it, and each app config's `tailwind.css` points at it, so there is exactly one source of style. |
| Each app keeps its own components | Per-app aliases `components`/`hooks`/`lib` → `@/…` keep app-specific components inside the app. |

Note for when the user adds `sonner` later: it needs a `<Toaster />` mounted in each app's
`layout.tsx`. That wiring is intentionally **out of scope** for this config-only slice.

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Component location | **Shared primitives in `@repo/ui` + app-local composition in `@/`** | Official monorepo pattern; one design system, with room for app-specific UI across three distinct apps |
| Scope | **Per-app config + one verification run** | Wire the tooling; user adds components themselves afterward (YAGNI) |
| Smoke-test component | **`label` via `apps/web`, then reverted** | Light dependency (`@radix-ui/react-label`); proves the pipeline, then leaves the tree config-only |
| Root convenience script | **None** | YAGNI; `pnpm dlx shadcn@latest …` is enough |
| `packages/ui/components.json` | **Unchanged** | Remains the home/config for shared primitives |
| `tailwind.css` target in app configs | **Shared globals** (`../../packages/ui/src/styles/globals.css`) | All apps import the shared globals; new CSS variables land in one place instead of fragmenting per app |

## 3. Deliverable

Three new files — `apps/web/components.json`, `apps/dashboard/components.json`,
`apps/website/components.json` — **byte-identical** (the apps sit at the same directory depth
and share the same aliases), each containing:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components/ui"
  }
}
```

Alias meaning:
- `ui` → `@repo/ui/components/ui` and `utils` → `@repo/ui/lib/utils`: primitives and the `cn`
  helper resolve to / are written into the shared package.
- `components` / `hooks` / `lib` → `@/…`: app-local composition (the app's `@/*` → `./src/*`
  alias already exists in each app's `tsconfig.json`).

No other changes: no new dependencies, no `tsconfig` edits, no change to
`turbo.json` or `packages/ui/components.json`. The apps already declare `@repo/ui`
(`workspace:*`) and resolve `@/*`, which is everything the CLI needs.

## 4. How it works (data flow)

Running `pnpm dlx shadcn@latest add <component> -c apps/<app>`:
1. The CLI reads `apps/<app>/components.json`.
2. The `ui`/`utils` aliases point at `@repo/ui`, so the CLI resolves the `@repo/ui`
   workspace package and writes the primitive to `packages/ui/src/components/ui/<component>.tsx`,
   adding any required dependency to `packages/ui/package.json`.
3. CSS variables (if the component needs them) are written to the shared globals
   (`packages/ui/src/styles/globals.css`).
4. Apps consume it via `import { <Component> } from '@repo/ui/components/ui/<component>'`,
   exactly as they already consume `button`/`card`/`input`.

## 5. Verification

1. Run `pnpm dlx shadcn@latest add label -c apps/web`.
2. Confirm: `packages/ui/src/components/ui/label.tsx` is created; `@radix-ui/react-label` is
   added to `packages/ui/package.json`; `pnpm-lock.yaml` updates.
3. Run `pnpm check-types` — expect all tasks successful (the new primitive type-checks and the
   `@repo/ui` package still compiles).
4. **Revert the smoke test**: delete `packages/ui/src/components/ui/label.tsx`, restore
   `packages/ui/package.json` and `pnpm-lock.yaml`, and re-run `pnpm install` so `node_modules`
   matches the restored lockfile. The committed result contains only the three `components.json`
   files.

Because the three `components.json` files are byte-identical and each app resolves `@/*` and
`@repo/ui` the same way, this single run validates the pattern for all three apps.

If `shadcn@latest` fails to detect the monorepo, retry with `shadcn@canary` (the Turborepo
guide references the canary channel for monorepo support) and note the working channel.

## 6. Out of scope (YAGNI)

- Adding a bulk set of components (only the reverted smoke-test `label`).
- Any root or per-app convenience script.
- Changes to `packages/ui/components.json` or existing components.
- App-local `@/components` / `@/hooks` / `@/lib` directories — created by the CLI on demand, not pre-seeded.
