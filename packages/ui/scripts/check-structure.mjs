#!/usr/bin/env node
// Verifies the @repo/ui atomic-design structure:
//   - every component lives in src/<layer>/<Name>/<Name>.tsx with a sibling index.ts
//   - the component folder is PascalCase
//   - the component is re-exported from its layer barrel src/<layer>/index.ts
//
// Exits non-zero and lists every problem. Wired into `pnpm --filter @repo/ui lint`
// and into a Claude Code PostToolUse hook for instant feedback while editing.
import { readdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAYERS = ["atoms", "molecules", "organisms"];
const problems = [];

for (const layer of LAYERS) {
  const layerDir = join(pkgRoot, "src", layer);
  if (!existsSync(layerDir)) {
    problems.push(`missing layer directory: src/${layer}`);
    continue;
  }

  const barrelPath = join(layerDir, "index.ts");
  if (!existsSync(barrelPath)) {
    problems.push(`missing layer barrel: src/${layer}/index.ts`);
  }
  const barrel = existsSync(barrelPath) ? readFileSync(barrelPath, "utf8") : "";

  for (const entry of readdirSync(layerDir)) {
    const entryPath = join(layerDir, entry);
    if (!statSync(entryPath).isDirectory()) {
      if (entry !== "index.ts") {
        problems.push(
          `src/${layer}/${entry}: components must live in their own folder, not directly in the layer`,
        );
      }
      continue;
    }

    const name = entry;
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
      problems.push(`src/${layer}/${name}: component folder must be PascalCase`);
    }
    if (!existsSync(join(entryPath, `${name}.tsx`))) {
      problems.push(`src/${layer}/${name}: missing component file ${name}.tsx`);
    }
    if (!existsSync(join(entryPath, "index.ts"))) {
      problems.push(`src/${layer}/${name}: missing index.ts`);
    }
    if (!barrel.includes(`"./${name}"`)) {
      problems.push(
        `src/${layer}/${name}: not re-exported from src/${layer}/index.ts (add: export * from "./${name}";)`,
      );
    }
  }

  // Flag barrel exports pointing at a folder that no longer exists (dangling).
  for (const m of barrel.matchAll(/export \* from "\.\/([^"]+)"/g)) {
    if (!existsSync(join(layerDir, m[1]))) {
      problems.push(
        `src/${layer}/index.ts exports "./${m[1]}" but src/${layer}/${m[1]} does not exist`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error("✖ @repo/ui atomic-design structure check failed:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("✓ @repo/ui atomic-design structure OK");
