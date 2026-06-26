# @repo/ui — atomic-design conventions

This package follows **atomic design**. Every component lives in a layer and has
its own folder + barrel. Keep this consistent — there is tooling that enforces it.

## Structure

```
src/
  atoms/        indivisible primitives, no app knowledge (Button, Input, Badge)
  molecules/    small combinations of atoms (FormField, SearchBar, Card)
  organisms/    larger self-contained blocks (Header, DataTable, Carousel, Toaster)
  hooks/  lib/  styles/        not layers — importable by anyone
  index.ts                     top-level barrel (re-exports the three layers)
```

Each component is its own folder:

```
src/atoms/Button/
  Button.tsx     # the component (PascalCase file = folder name)
  index.ts       # export * from "./Button";
src/atoms/index.ts   # layer barrel, re-exports every atom
```

## Adding a component — use the generator

**Do not hand-create component folders.** Run the generator so the folder, file,
index, and barrel export are all created consistently:

```bash
pnpm --filter @repo/ui gen      # pick "component", then name + layer
# or:  turbo gen component
```

It scaffolds `src/<layer>/<Name>/<Name>.tsx` + `index.ts` and appends the export
to `src/<layer>/index.ts` at the `// __INJECT_COMPONENT_EXPORT__` marker.

If you must do it by hand, mirror an existing component exactly and add the
`export * from "./<Name>";` line to the layer barrel.

## Rules (enforced by lint — `turbo run lint`)

- **Dependency direction is downward only:** `organisms → molecules → atoms`.
  An atom may not import molecules/organisms; a molecule may not import organisms.
  Enforced via `no-restricted-imports` in `eslint.config.js`.
- **The package never depends on an app.** Only generic, app-agnostic components
  belong here. App-specific logic (a concrete data model, one app's routes) lives
  in the app, not here. (Framework primitives like `next/link` are fine — every
  app is Next.js — but app-specific knowledge is not.)
- **Structure check:** `scripts/check-structure.mjs` (part of `lint`) fails the
  build if a component is missing its `.tsx`/`index.ts` or its barrel export.

## Conventions

- **TypeScript + Tailwind CSS v4 + shadcn/ui.** Use `cn()` from `@repo/ui/lib/utils`
  and `class-variance-authority` for variants. Do not introduce other styling tools.
- **Imports use the layer barrel:** `import { Button } from "@repo/ui/atoms"`
  (likewise `@repo/ui/molecules`, `@repo/ui/organisms`). The `exports` field maps
  these subpaths so tree-shaking keeps working — keep it in sync when adding a layer.
- This is a **restructure-friendly** package: moving/renaming is fine, but do not
  change a component's public API/behavior as a side effect — flag that separately.

## Categorization quick guide

| Layer | Test |
|---|---|
| **atom** | single element, can't be meaningfully split, no composition of other UI components |
| **molecule** | composes a few atoms / is a small compound (parts exported together) |
| **organism** | larger, stateful, self-contained block (own context/state, composes molecules) |

Templates/pages do **not** belong here — they live in the apps.
