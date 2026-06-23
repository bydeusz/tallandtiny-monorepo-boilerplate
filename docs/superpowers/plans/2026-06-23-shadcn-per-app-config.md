# shadcn Per-App Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each frontend app (`apps/web`, `apps/dashboard`, `apps/website`) its own `components.json` so the shadcn/ui CLI can be targeted per app, with shared primitives resolving into `@repo/ui` and app-local composition under `@/`.

**Architecture:** Follow the official shadcn + Turborepo monorepo pattern. Each app gets a byte-identical `components.json` whose `ui`/`utils` aliases point at the shared `@repo/ui` package (so `shadcn add` writes primitives there) and whose `components`/`hooks`/`lib` aliases point at the app's own `@/`. A single real `shadcn add` run validates the wiring, then is reverted so the committed change is config-only.

**Tech Stack:** shadcn/ui CLI (`pnpm dlx shadcn@latest`) · Tailwind v4 · Turborepo · pnpm · Next.js 16 · `@repo/ui` (shared shadcn package).

## Global Constraints

- Three new files only: `apps/web/components.json`, `apps/dashboard/components.json`, `apps/website/components.json` — **byte-identical** (the apps sit at the same depth and share the same aliases).
- Exact config content (from the spec): `style` `new-york`, `rsc` `true`, `tsx` `true`, `iconLibrary` `lucide`, `tailwind.baseColor` `neutral`, `tailwind.cssVariables` `true`, `tailwind.prefix` `""`, `tailwind.config` `""`, `tailwind.css` `"../../packages/ui/src/styles/globals.css"`.
- Aliases: `components` → `@/components`, `hooks` → `@/hooks`, `lib` → `@/lib`, `utils` → `@repo/ui/lib/utils`, `ui` → `@repo/ui/components/ui`.
- **Do NOT change**: `packages/ui/components.json`, any existing component, `turbo.json`, any `tsconfig.json`, or any `package.json` dependency list. No new dependencies in the committed result.
- Smoke test uses component **`label`** via `apps/web`, then is fully reverted — the committed diff contains **only** the three `components.json` files.
- Commit messages follow Conventional Commits and end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

**Note on testing:** this is configuration plus a one-shot CLI verification; there is no business logic to unit-test. The test cycle is the real `shadcn add` smoke run + `pnpm check-types`, after which the smoke artifacts are reverted. Those runs ARE the gate.

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/components.json` (create) | shadcn CLI config for the web app — shared `ui`/`utils`, app-local `components`/`hooks`/`lib` |
| `apps/dashboard/components.json` (create) | Same config for the dashboard app |
| `apps/website/components.json` (create) | Same config for the website app |

No other files are part of the committed deliverable. `packages/ui` already holds the shared theme (`src/styles/globals.css`) and primitives, and each app already declares `@repo/ui` (`workspace:*`) and resolves `@/*` → `./src/*` in its `tsconfig.json` — everything the CLI needs already exists.

---

### Task 1: Per-app `components.json` + verified config

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/dashboard/components.json`
- Create: `apps/website/components.json`

**Interfaces:**
- Consumes: the existing `@repo/ui` package (its `components.json`, `src/components/ui`, `src/lib/utils.ts`, `src/styles/globals.css`) and each app's existing `@/*` → `./src/*` tsconfig alias.
- Produces: three `components.json` files enabling `pnpm dlx shadcn@latest add <component> -c apps/<app>`, with primitives landing in `packages/ui/src/components/ui/`.

- [ ] **Step 1: Confirm a clean starting tree**

Run: `git status --porcelain`
Expected: empty output (no uncommitted changes). If not empty, stop and report — the revert step relies on a clean baseline.

- [ ] **Step 2: Create `apps/web/components.json`**

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

- [ ] **Step 3: Create `apps/dashboard/components.json`** (identical content)

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

- [ ] **Step 4: Create `apps/website/components.json`** (identical content)

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

- [ ] **Step 5: Confirm the three files are byte-identical**

Run: `diff apps/web/components.json apps/dashboard/components.json && diff apps/web/components.json apps/website/components.json && echo IDENTICAL`
Expected: `IDENTICAL` (no diff output). If they differ, fix so all three match exactly.

- [ ] **Step 6: Run the smoke test — add `label` via the web app config**

Run: `pnpm dlx shadcn@latest add label -c apps/web -y`
Expected: the CLI reports adding the `label` component. It should write `packages/ui/src/components/ui/label.tsx` and add `@radix-ui/react-label` to `packages/ui/package.json`.

If the CLI errors with a monorepo/resolution problem on `@latest`, retry once with the canary channel: `pnpm dlx shadcn@canary add label -c apps/web -y`, and note in the report which channel worked.

- [ ] **Step 7: Verify the smoke test landed in the shared package**

Run:
```bash
test -f packages/ui/src/components/ui/label.tsx && echo "label.tsx OK"
grep -q '@radix-ui/react-label' packages/ui/package.json && echo "dep OK"
grep -q '@repo/ui/lib/utils' packages/ui/src/components/ui/label.tsx && echo "cn import OK"
```
Expected: `label.tsx OK`, `dep OK`, `cn import OK`. The third check confirms the generated component imports `cn` from the shared `@repo/ui/lib/utils` (i.e. the `utils` alias resolved to the shared package, proving the monorepo wiring).

If `@radix-ui/react-label` was added but not yet installed into `node_modules`, run `pnpm install` before the next step so the type-check can resolve it.

- [ ] **Step 8: Type-check the workspace with the smoke component present**

Run: `pnpm check-types`
Expected: all tasks successful (e.g. `Tasks: N successful, N total`). This proves the freshly generated primitive type-checks inside `@repo/ui` and breaks nothing.

- [ ] **Step 9: Revert the smoke test — leave only the three config files**

Run:
```bash
rm packages/ui/src/components/ui/label.tsx
git checkout -- packages/ui/package.json pnpm-lock.yaml
pnpm install
```
This deletes the generated component, restores `packages/ui/package.json` and the lockfile to their committed state, and resyncs `node_modules` (pruning `@radix-ui/react-label`).

- [ ] **Step 10: Confirm only the three config files remain changed**

Run: `git status --porcelain`
Expected: exactly these three lines (order may vary), and nothing else:
```
?? apps/dashboard/components.json
?? apps/web/components.json
?? apps/website/components.json
```
If `packages/ui/` or `pnpm-lock.yaml` still show as modified, the revert was incomplete — re-run Step 9 and re-check.

- [ ] **Step 11: Commit the three config files**

```bash
git add apps/web/components.json apps/dashboard/components.json apps/website/components.json
git commit -m "$(cat <<'EOF'
feat(ui): add per-app shadcn components.json (monorepo config)

Give web, dashboard, and website each a components.json following the
shadcn + Turborepo monorepo pattern: ui/utils aliases resolve to the
shared @repo/ui package, components/hooks/lib stay app-local under @/,
and tailwind.css points at the shared globals for one theme. Verified
with a reverted `shadcn add label` smoke run; config-only commit.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 12: Confirm the committed diff is config-only**

Run: `git show --stat --oneline HEAD`
Expected: exactly three files changed — `apps/web/components.json`, `apps/dashboard/components.json`, `apps/website/components.json` — and no others.

---

## Self-Review

**Spec coverage:**
- §3 deliverable (three byte-identical `components.json` with the exact content/aliases) → Task 1 Steps 2–5. ✓
- §1a requirement "general components shared" / "one style" / "app-local components" → encoded in the alias choices (`ui`/`utils` → `@repo/ui`; `tailwind.css` → shared globals; `components`/`hooks`/`lib` → `@/`) in Steps 2–4. ✓
- §5 verification (run `shadcn add label -c apps/web`, confirm location + dep, `pnpm check-types`, then revert) → Steps 6–10; canary fallback included in Step 6. ✓
- §5 "committed result contains only the three components.json files" → Steps 9–10 (revert + status check) and Step 12 (committed-diff check). ✓
- §6 out of scope (no bulk components, no scripts, no change to `packages/ui/components.json`/tsconfig/deps) → Global Constraints forbid them; no step adds them; the smoke `label` is reverted. ✓
- Sonner/`<Toaster />` wiring explicitly out of scope → not present in any step. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases". Every create step shows full file content; every run step shows the exact command and expected output. ✓

**Type/name consistency:** The three files are asserted byte-identical (Step 5); alias names (`components`/`hooks`/`lib`/`utils`/`ui`) and values match the spec verbatim across all three; the smoke component (`label`) and its dep (`@radix-ui/react-label`) are named consistently in Steps 6–9. ✓
