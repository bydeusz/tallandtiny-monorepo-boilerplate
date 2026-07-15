---
name: update-docs
description: "Use when existing documentation in the Fumadocs docs app (apps/docs) has fallen behind the code — a feature was extended, a command renamed, a response shape changed, or new functionality was added after the page was written — and the docs need to be brought back in line. Triggers on /project:update-docs, \"werk de docs bij\", \"update de docs\", \"de docs kloppen niet meer\", \"zijn mijn docs nog actueel\", \"audit de docs\", \"de documentatie is verouderd\", \"breng de docs in lijn met de code\", \"update the docs\", \"the docs are out of date\"."
---

# /project:update-docs

Reconcile the **existing** documentation in the docs app (`apps/docs`) with the code as it is **now** — find every page whose claims have drifted from the source, and patch the drifted parts in place — then ship the fixes as a draft PR.

## Core principle

**Updating docs is grounding run in reverse: instead of writing new claims from the code, you take each claim a page already makes and re-verify it against the current code — then change only what no longer matches.** The deliverable is a **repo-wide drift audit + surgical patches**, not a rewrite and not new pages. Three things kill a doc-update: (1) rewriting a mostly-correct page from scratch — it clobbers hand-edits, drifts the language versions apart, and buries the real change in a noisy diff; (2) touching only the page you were told about while the rest of the site quietly rots; (3) editing the English page and leaving its Dutch sibling stale. So this skill **checks every page**, patches only the spans that drifted (both language siblings in lockstep), **bumps the `last-updated` stamp only on pages it actually changed**, and hands genuinely undocumented features off to generate-docs rather than inventing pages. You approve the diffs **before** anything is written.

## Relationship to generate-docs

`/project:generate-docs` **creates** a page for a feature you just built. `/project:update-docs` **reconciles** pages that already exist with code that has since changed. They are two ends of the same loop.

**REQUIRED BACKGROUND:** this skill reuses generate-docs' definitions and does **not** restate them — read generate-docs for: the **grounding rule** (every concrete value verified against the code, else a visible `{/* TODO: verify */}`), the **page skeleton**, the **plain-language recipe**, the **i18n conventions** (Fumadocs `dot` parser: `<slug>.mdx` = default/`en`, `<slug>.nl.mdx` = Dutch, `meta.nl.json`; languages read live from `apps/docs/src/lib/i18n.ts`), the **metadata bar**, the **approval gate**, and the **docs-only draft-PR** flow. update-docs changes only the *unit of work*: from "author a page" to "diff each existing page's claims against current code and patch the drift."

## When to use — and when not

- **Use when** existing pages have fallen behind: a documented command/script was renamed, an endpoint or response field changed, a new capability isn't mentioned, a config/table value is now wrong, or the user just says "zijn mijn docs nog actueel / werk de docs bij."
- **A changed feature that has no page at all is not this skill's job.** Report it and hand it to `/project:generate-docs` (see step 3) — update-docs never creates a new page.
- **No docs app** (`apps/docs/content/docs/` absent) → stop and report, same as generate-docs.

## Workflow

In order. **Nothing is written to disk until you approve the diffs (step 5).** Run graphify first per the repo rule: `graphify query "<area>"` before reading raw source.

### 1. Inventory every page and the app's conventions
Enumerate **all** content under `apps/docs/content/docs/**` — each `.mdx` **and** its language siblings (`.nl.mdx`) — plus the `meta.json` / `meta.<locale>.json` nav files. Read `src/lib/i18n.ts` for the language list + default (see generate-docs → *Multi-language output*). This is the audit set: **every page is checked**, not only the one the user named. Only narrow the set when the user explicitly scopes it to a page or section — an unscoped request ("werk de docs bij") means the whole site.

### 2. Detect drift per page — grounding in reverse
For **each** page, produce a **drift list** — every claim that no longer matches the code — using three passes. Delegate per-page checks to subagents (absolute paths, the page, "return a drift list: doc-says → code-says-now → fix"; include the graphify rule) to keep your context clean.

- **Anchor on when the prose was written.** The metadata bar carries a `last-updated` date; confirm it with `git log -1 --format=%cs -- <docfile>`. Then diff the code that changed since: `git log -1 --format=%H -- <docfile>` → `git diff <that-sha>..HEAD -- apps/ packages/`. That surfaces exactly the renamed commands, new fields, and new capabilities added *after* the page — so you check the delta, not the whole repo blind.
- **Re-verify every checkable claim.** Walk the page's concrete values — commands, scripts, file paths, imports, endpoints + methods, function/DTO signatures, request/response shapes, `TypeTable` rows, config tables, ports, env vars — and confirm each still matches the current code / `package.json`. Every mismatch is drift.
- **Find coverage gaps.** Compare capabilities that exist in the code against what the page mentions; newly-added functionality the page omits is drift too (an addition, not a correction).

Ground each corrected value once (generate-docs' rule); if you cannot verify it, write `{/* TODO: verify <what> */}` rather than guessing.

### 3. Classify each page
- **Stale** — has a non-empty drift list → patch it (step 4).
- **Clean** — every claim re-verified, nothing drifted → leave it **untouched**, including its stamp; record "checked, still correct" for the report.
- **Undocumented feature** — you found functionality in the code with **no** page covering it → **do not create one.** List it and defer: *"This feature has no doc page — use `/project:generate-docs`."* That is generate-docs' job; update-docs stops there.

### 4. Patch the stale pages — surgical, both languages, stamp bumped
For each stale page, produce a **minimal diff**, not a fresh page:
- **Change only the drifted spans.** Edit the exact command, path, field, row, or sentence that no longer matches; leave every still-true line **byte-for-byte** unchanged. For a new capability, add the sentences/section in the page's existing structure — don't restructure a page that's mostly right. (Regenerating a whole page from the skeleton is only for a page so heavily reworked that patching is more error-prone — the rare case — and even then keep the slug and the metadata bar.)
- **Keep the language siblings in lockstep.** Every change lands in both `<slug>.mdx` and `<slug>.nl.mdx`: grounded values (commands, paths, identifiers, field names) go into the `.nl.mdx` **verbatim** — never translated — and the surrounding prose gets the equivalent Dutch edit (plain-language recipe, in Dutch). If a stale page's `.nl.mdx` is **missing**, create it — otherwise the `/nl/...` route silently serves the (now-stale) default-language fallback.
- **Bump `last-updated` to today** (`date +%Y-%m-%d`) on **every page you changed**, in both language siblings — and only those. Update `applies-to` if the app/version it documents changed. Leave clean pages' stamps alone: bumping an unchanged page advertises false freshness.

### 5. Show the diffs and get approval
Present, before writing anything:
- A **drift triage table** per stale page: *what the doc says now → what the code says now → the fix*.
- The **actual changes as diffs** (old line → new line) in **both** languages, including the `last-updated` bumps and any `meta.json` / `meta.<locale>.json` diffs — not full-page dumps.
- The list of **clean pages** (checked, unchanged) and the list of **undocumented features** deferred to generate-docs.

Apply the user's edits. **Only after explicit approval do you write to disk.**

### 6. Write, then ship as a draft PR
Write the edits. Then, on the docs branch/worktree:
- Commit **only the changed docs files** (pages + any `meta` files) — no `graphify-out/`, no unrelated changes.
- Push and open a **draft PR** against `develop`.
- Run `graphify update .` after writing so the graph reflects the changes.

### 7. Report
Per page: **changed** (+ a one-line what), **verified clean** (unchanged), or **deferred to generate-docs** (undocumented feature). Plus any `TODO: verify` markers still open and the draft-PR link.

## Grounding in reverse — the core technique

A new page grounds forward: read the code, write the claim. An update grounds **backward**: read the claim the page already makes, then confirm the code still backs it.

| The page claims… | You must… |
|---|---|
| `pnpm --filter api seed` | Open `package.json` — is the script still named `seed`? If it's now `seed:roles`, that's drift → fix the exact span. |
| a response has `{ id, email, role }` | Read the current DTO — did a field get added/removed/renamed? |
| a `TypeTable` / config row with a default | Re-read the option's real default in code; defaults drift silently. |
| (nothing about a new command that now exists) | Coverage gap → add it; a missing capability is drift too. |

The `last-updated` stamp is your anchor: `git log -1 -- <docfile>` tells you when the prose was written, and the code diff since then is your shortlist of what to re-check.

## Never do this

- **Rewrite a page that's mostly correct.** A full regenerate clobbers hand-edits, drifts `en`/`nl` apart, and hides the real change in noise. Patch the drifted spans only (step 4).
- **Touch only the page the user named while skipping the audit.** An unscoped "werk de docs bij" means check **every** page — the whole point is catching the rot you weren't told about (step 1).
- **Bump `last-updated` on a page you didn't change.** The stamp means "last time the content was made true" — a bump on unchanged content is a false freshness signal (step 4).
- **Edit the English page and leave the `.nl.mdx` stale.** Both siblings move together, or the Dutch reader gets half-updated docs (step 4).
- **Translate a command/identifier when patching the `.nl.mdx`.** Grounded values are byte-identical across languages — only prose is translated (generate-docs → *Multi-language output*).
- **Create a page for an undocumented feature.** That's generate-docs. Report it and stop (step 3).
- **Write before showing the diffs.** The approval gate shows diffs, not a fait accompli (step 5).
- **Commit `graphify-out/` or unrelated files** (step 6).

| Rationalization | Reality |
|---|---|
| "The page is stale enough — I'll just regenerate it fresh" | Regenerating drifts the language files, wipes hand-edits, and buries the one real change. Patch the drifted spans; keep the rest byte-for-byte. |
| "They said the testing page — I'll only touch that one" | Unless they scoped it, "update the docs" is a full audit. Check every page; the silent rot is the point. |
| "I changed the English page, the Dutch one is basically the same" | "Basically" is how `/nl` ends up serving stale content. Every edit lands in both siblings, in lockstep. |
| "I'll bump every page's date so they all look current" | The stamp tracks real content changes. Bump only what you changed; a false stamp is worse than an old one. |
| "This new feature has no page, I'll just add it here" | Undocumented features go to generate-docs, not crammed into an unrelated page. Report and defer. |
| "The doc probably still matches, I'll leave the claim" | "Probably" isn't verified. Re-ground the claim against current code, or mark `{/* TODO: verify */}`. |

**Red flags — STOP:**
- About to replace a whole page's contents instead of editing the drifted lines.
- About to update only the page you were told about, skipping the rest.
- About to change `<slug>.mdx` without the matching `<slug>.nl.mdx`.
- About to bump a `last-updated` on a page you didn't otherwise change.
- About to create a new page for a feature that has none (that's generate-docs).
- Writing a corrected value you didn't re-verify against the code.

## Quick reference

| Step | Action | Key detail |
|------|--------|------------|
| 1 | Inventory every page + conventions | all `content/docs/**` (`.mdx` + `.nl.mdx`) + `meta`; read `i18n.ts`; audit the whole site unless scoped |
| 2 | Detect drift — grounding in reverse | anchor on `last-updated` + `git log -1 -- <doc>` → `git diff <sha>..HEAD`; re-verify every claim; find coverage gaps |
| 3 | Classify | stale → patch · clean → leave (incl. stamp) · undocumented feature → defer to generate-docs |
| 4 | Patch surgically | change only drifted spans; both langs in lockstep (code verbatim, prose translated); bump `last-updated` on changed pages only |
| 5 | Show diffs → approve | drift table + old→new diffs (both langs) + meta diffs; write only after approval |
| 6 | Ship | commit docs only (no `graphify-out/`), push, draft PR → `develop`; `graphify update .` |
| 7 | Report | per page: changed / clean / deferred; open TODOs + PR link |

## Common mistakes
- **Rewriting instead of patching.** The #1 failure — regenerate drifts languages and wipes edits. Minimal diff on the drifted spans (step 4).
- **Doing one page, not the audit.** "Update the docs" without a named page = check them all (step 1).
- **Updating `en`, forgetting `nl`.** Both siblings move together; create a missing `.nl.mdx` rather than leaving `/nl` on a stale fallback (step 4).
- **Stamping unchanged pages.** Bump `last-updated` only on pages you actually edited (step 4).
- **Inventing pages for undocumented features.** Defer to generate-docs (step 3).
- **Trusting a claim without re-grounding it.** Re-verify every value against current code, or mark `{/* TODO: verify */}` (step 2).
- **Dumping whole pages at the gate.** Show diffs and a drift table, not full rewrites (step 5).
- **Committing `graphify-out/` or unrelated files** (step 6).
