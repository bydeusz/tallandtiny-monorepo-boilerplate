---
name: generate-docs
description: "Use when a feature or change has just been built and its developer documentation should be written into the Fumadocs docs app (apps/docs) — a per-feature page covering how it works, how to use it, and its dependencies. Triggers on /project:generate-docs, \"documenteer deze feature\", \"genereer docs voor …\", \"schrijf documentatie voor wat ik net heb gebouwd\", \"add this to the docs site\"."
---

# /project:generate-docs

Turn a feature you just built into a thorough **Fumadocs** documentation page in the docs app (`apps/docs`), grounded in the code that was actually written, and ship it as a draft PR.

## Core principle

**Generated docs describe the code that was actually built — every concrete claim verified against the source, never guessed — and every page follows one fixed skeleton so nothing required is silently dropped.** Two failure modes kill developer docs: (1) plausible-but-wrong specifics — a seed command, an import path, a response shape that doesn't match the code; and (2) the un-sexy required parts going missing — dependencies, an anti-staleness stamp, links out. So this skill grounds every command, path, signature, endpoint, and request/response shape in the real code and the git diff, and marks anything it can't verify as a **visible TODO** rather than presenting a guess as fact. You approve the placement and the full page **before** anything is written; then it's committed and opened as a draft PR.

## Companion skills

`/project:create-story` files the ticket, `/project:start-ticket` builds it, `/project:test-ticket` verifies it — **this one documents it**. Same repo. The page lands in the Fumadocs docs app introduced by ticket 8 (`apps/docs`).

## The docs app (Fumadocs)

- **Content** is authored as **MDX under `apps/docs/content/docs/`**. The file's path is its URL slug (`content/docs/auth/roles.mdx` → `/docs/auth/roles`); `index.mdx` is the folder's landing page (slug drops the filename).
- **Frontmatter:** `title` (required — page heading + sidebar label) and `description` (summary + search). Other keys need a schema in `source.config.ts`; stick to these two.
- **Navigation** is per-folder `meta.json` with a `pages` array that orders the sidebar. **A page not listed in `pages` and not covered by a `"..."` rest-item is hidden from the sidebar** (still reachable by URL). This is the trap to avoid (step 5).
- **Built-in MDX components** (no imports/wiring needed): `Callout` (global — `info`/`warn`/`error`/`success`), `Steps`/`Step`, `Tabs`/`Tab`, `Cards`/`Card`, `TypeTable` (prop/option tables), `Files`. Fenced code blocks take `title="file.ts"` and line markers `// [!code highlight]` · `// [!code ++]` · `// [!code --]`.
- **Preview locally:** `pnpm dev:docs` → `http://localhost:3004`. Fumadocs regenerates its `.source/` automatically — no manual codegen.
- **If there is no Fumadocs app yet** (`apps/docs/content/docs/` or `source.config.ts` absent), **stop and report.** This skill writes *into* that app; it does not scaffold it — that's ticket 8.

## Workflow

In order. **Nothing is written to disk until you approve the preview (step 6).** Steps 1–3 run graphify first (repo rule): `graphify query "<topic>"` before reading raw source.

### 1. See what was actually built — the fact-sheet
If you built the feature earlier in this chat you already have the context — but still confirm the specifics against the code before quoting them. Otherwise inspect the change: on the feature's branch/worktree run `git log <base>..HEAD` and `git diff <base>...HEAD` (base is usually `develop`) and read the changed files.

Produce a short **fact-sheet**: the real file paths, routes/endpoints + HTTP methods, commands/scripts (read from `package.json`), function/DTO signatures, request/response shapes, new dependencies, and env vars. **This fact-sheet — not memory and not the ticket wording — is the source for every concrete value in the doc.** Delegating this read to a subagent keeps your context clean; have it return the fact-sheet.

### 2. Locate the docs app and read its nav
Find the Fumadocs app (`apps/docs`; confirm via `source.config.ts` + `content/docs/`). Read the existing `content/docs/` tree and the relevant `meta.json` files, so you place the page in the right section and match the existing conventions. For each candidate folder note whether its `meta.json` uses an explicit `pages` list or a `"..."` rest-item — that decides whether you must hand-add the page in step 5.

### 3. Ground every concrete claim in the code — never guess
The rule that makes docs trustworthy: **no command, path, import, signature, endpoint, or request/response shape enters the page unless you verified it against the actual code, `package.json`, or the step-1 diff.** If you cannot verify a specific — the exact seed-script name, a field on a response DTO, an import path — do **not** invent a plausible value. Write the real one, or mark it `{/* TODO: verify <what> */}` and list it in the report. A polished page full of wrong commands and import paths is worse than an honest gap.

### 4. Write the page to the fixed skeleton
Produce **one** Fumadocs MDX page using the **skeleton below** — REQUIRED sections always present, optional ones only when the feature has them. Ground every concrete value per step 3, use the built-in components, and give code blocks a `title=`. Fill the **metadata bar** with today's date (`date +%Y-%m-%d`), the owner, and what it applies to (app/package).

### 5. Integrate into the sidebar — or the page hides
Slot the page into the nav so it actually shows up:
- **Existing section, `meta.json` has a `"..."` rest-item** → the page auto-lists; add an explicit entry only to control ordering.
- **Existing section, `meta.json` has an explicit `pages` list with no `"..."`** → you **MUST** add the page's basename to `pages`, or it stays hidden.
- **New section** → create the folder's `meta.json` with a `title` and a `pages` array that includes the page **and** `"..."` (so future pages aren't hidden).
- Never create a second file that resolves to an existing page's URL — the loader errors on duplicate slugs.

### 6. Propose placement and preview — approve before writing
Show the engineer three things: the **target file path**, the **`meta.json` change as a diff**, and the **full MDX page**. Ask them to read, edit if they want, and approve. Apply their edits. **Only after explicit approval do you write to disk.** Docs are a committed artifact — the gate exists so the engineer sees them before they land.

### 7. Write, then ship as a draft PR
Write the `.mdx` and update `meta.json`. Then, on the feature's branch/worktree:
- Commit **only the docs files** (the new page + `meta.json`) — not unrelated changes, and keep `graphify-out/` out of the commit.
- Push and open a **draft PR** against `develop`.
- If graphify is in use, run `graphify update .` after writing so the graph reflects the new page.

### 8. Report
Give the page path + slug, the placement, any `TODO: verify` markers still open, the local preview URL (`http://localhost:3004/docs/<slug>`), and the draft-PR link.

## The page skeleton

Same skeleton every page, so readers build muscle memory and nothing required is dropped. Order top-to-bottom:

**REQUIRED — always present:**
1. **Frontmatter** — `title` + `description`.
2. **One-line summary** — opening sentence: what the feature does.
3. **Overview — what & why** — 2–4 sentences: the problem it solves and when to reach for it (not internals).
4. **Metadata bar** — `last-updated` (today), owner/team, applies-to (app/package + version). The anti-staleness stamp. A small `<Callout>` or table.
5. **Prerequisites & dependencies** — required packages/services/versions, env vars, migrations, permissions, **and the internal features this depends on** — linked, both directions (needs / needed-by).
6. **Quick start** — the smallest complete, **runnable, copy-pasteable** example that produces a visible result. No `...`/pseudo-code.
7. **Usage / how-to** — task-oriented recipes, minimal-first then advanced, each with a real grounded snippet.
8. **API / reference** — exhaustive and neutral: props/params (`TypeTable`), endpoints + methods, request/response shapes, return values, errors. Every value grounded (step 3).
9. **Related links** — links to dependent/depended-on features, deeper docs, source, changelog. **No dead ends.**

**OPTIONAL — include only when the feature has them:**
- **Setup / installation** — steps beyond the prerequisites.
- **Configuration** — options table: name · type · default · effect.
- **How it works** — high-level internals / data-flow; a paragraph, a `<Files>` tree, or one diagram. Not a code tour.
- **Edge cases & gotchas** — limits, defaults that bite, security/permission notes.
- **Troubleshooting / FAQ** — symptom → cause → fix.

Keep the four Diátaxis modes (how-to · reference · explanation · tutorial) in **separate sections** — blend on the page, never within a section.

### Skeleton in MDX (shape to adapt — fill from the fact-sheet, don't copy the values)
```mdx
---
title: <Feature name>
description: <One sentence, used for search and the sidebar subtitle.>
---

<One-sentence summary of what this feature does.>

## Overview
<2–4 sentences: the problem it solves, when to use it.>

<Callout type="info">
  **Last updated** 2026-07-13 · **Owner** <team/person> · **Applies to** `apps/api` (v<x.y>)
</Callout>

## Prerequisites & dependencies
- <required package / service / version>
- env: `FOO_BAR` — <what it's for>
- Depends on [<related feature>](/docs/<slug>); used by [<consumer>](/docs/<slug>).

## Quick start
```ts title="<real/path.ts>"
// smallest runnable example — every symbol/path verified against the code
```

## Usage
<task recipes, minimal-first; real snippets>

## Reference
<TypeTable / endpoint + method / request+response shape — all grounded>

## Related
- [<dependency>](/docs/<slug>) · [source](<repo path>) · [changelog](<...>)
```

## Grounding — the rule that keeps docs honest

Under the pull to produce a complete-looking page, the tempting shortcut is to fill concrete values from memory. Don't.

| Rationalization | Reality |
|---|---|
| "It's almost certainly `db:seed`" | Open `package.json` and read the real script name, or mark TODO. A wrong command wastes every reader. |
| "The response probably has `id`/`email`/`role`" | Read the DTO. Invented response shapes are the fastest way docs rot. |
| "The import path is standard" | Paths differ per repo. graphify/grep the real one. |
| "I'll fix the exact details later" | Later never comes. Ship a visible `{/* TODO: verify */}`, not a confident guess. |
| "The ticket says it works this way" | The ticket is intent; the code is truth. Document the code. |

**Red flags — STOP and verify (or mark TODO):**
- Writing a command, path, or endpoint you did not read in the code.
- A response/DTO shape recalled from memory.
- "This is probably how it's wired."

## Quick reference

| Step | Action | Key detail |
|------|--------|------------|
| 1 | Fact-sheet from the diff | `git diff <base>...HEAD` + read files; real paths/commands/shapes |
| 2 | Read docs nav | `apps/docs/content/docs/**` + `meta.json`; explicit `pages` vs `"..."` |
| 3 | Ground every value | verified against code/`package.json`/diff, else `{/* TODO: verify */}` |
| 4 | Write to the skeleton | REQUIRED sections + optional-when-relevant; metadata bar dated today |
| 5 | Wire into `meta.json` | add to `pages` unless a `"..."` covers it — else the page hides |
| 6 | Preview → approve | show path + meta diff + full MDX; write only after approval |
| 7 | Ship | commit docs only (no `graphify-out/`), push, draft PR → `develop` |

## Common mistakes
- **Guessing commands, paths, or response shapes.** Verify against the code, or mark `{/* TODO: verify */}` (step 3). A confident wrong value is worse than a flagged gap.
- **Dropping a file into a folder whose `meta.json` has an explicit `pages` list without adding it.** The page is then hidden from the sidebar (step 5). Add it, or ensure a `"..."` rest-item covers it.
- **Omitting the metadata bar or Related links.** Both are REQUIRED — the metadata stamp fights staleness, the links stop dead ends.
- **A wall of prose or an example that won't run.** Use the templated sections and a real, copy-pasteable snippet.
- **Writing before approval.** Placement + full preview go to the engineer first (step 6).
- **Committing `graphify-out/` or unrelated files.** Stage only the new page + `meta.json` (step 7).
- **Scaffolding the docs app.** Out of scope — this skill writes pages into the existing `apps/docs` (ticket 8 builds the app).
