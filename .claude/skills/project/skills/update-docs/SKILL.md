---
name: update-docs
description: "Use when existing documentation in the Fumadocs docs app (apps/docs) has fallen behind the code — a feature was extended, a command renamed, a response shape changed, or new functionality was added after the page was written — and the docs need to be brought back in line, or when the user wants to first see which docs are out of date before anything is changed. Triggers on /project:update-docs, \"werk de docs bij\", \"update de docs\", \"de docs kloppen niet meer\", \"welke docs zijn verouderd\", \"laat zien welke docs een update nodig hebben\", \"zijn mijn docs nog actueel\", \"audit de docs\", \"update the docs\", \"which docs are out of date\"."
---

# /project:update-docs

Reconcile the **existing** documentation in the docs app (`apps/docs`) with the code as it is **now**. First research every page and show a ranked list of which docs need an update; then, on the pages the user picks, patch the drifted parts in place and ship the fixes as a draft PR.

## Core principle

**Updating docs is grounding run in reverse: instead of writing new claims from the code, you take each claim a page already makes and re-verify it against the current code — then change only what no longer matches.** This runs in **two phases with a checkpoint between them**: **Phase 1 researches every page and reports a ranked, worst-first list of what needs updating — and stops there**; the user picks which docs to act on; **Phase 2 patches only the chosen pages.** The research always comes first as its own reviewable deliverable — no page is edited, and no diff is even prepared, until the user has seen the list and chosen. Then three things keep the patching honest: (1) surgical edits, never rewrites — a rewrite clobbers hand-edits, drifts the language versions apart, and buries the real change; (2) both language siblings move in lockstep; (3) the `last-updated` stamp is bumped only on pages actually changed. Undocumented features are reported and handed to generate-docs, never invented as new pages.

## Relationship to generate-docs

`/project:generate-docs` **creates** a page for a feature you just built. `/project:update-docs` **reconciles** pages that already exist with code that has since changed. They are two ends of the same loop.

**REQUIRED BACKGROUND:** this skill reuses generate-docs' definitions and does **not** restate them — read generate-docs for: the **grounding rule** (every concrete value verified against the code, else a visible `{/* TODO: verify */}`), the **page skeleton**, the **plain-language recipe**, the **i18n conventions** (Fumadocs `dot` parser: `<slug>.mdx` = default/`en`, `<slug>.nl.mdx` = Dutch, `meta.nl.json`; languages read live from `apps/docs/src/lib/i18n.ts`), the **metadata bar**, the **approval gate**, and the **docs-only draft-PR** flow. update-docs changes only the *unit of work*: from "author a page" to "audit each existing page, then patch the drift the user picks."

## When to use — and when not

- **Use when** existing pages have fallen behind: a documented command/script was renamed, an endpoint or response field changed, a new capability isn't mentioned, a config/table value is now wrong — or the user just wants to **see which docs are stale before touching anything** ("welke docs zijn verouderd", "werk de docs bij").
- **A changed feature that has no page at all is not this skill's job.** Report it and hand it to `/project:generate-docs` — update-docs never creates a new page.
- **No docs app** (`apps/docs/content/docs/` absent) → stop and report, same as generate-docs.

## Workflow — two phases

Run graphify first per the repo rule: `graphify query "<area>"` before reading raw source.

---

## Phase 1 — Audit: research every page, report what needs updating

**Phase 1 produces a list and nothing else. Do not prepare patches, write diffs, or edit files here — that is Phase 2, and only after the user picks.**

### 1. Inventory every page and the app's conventions
Enumerate **all** content under `apps/docs/content/docs/**` — each `.mdx` **and** its language siblings (`.nl.mdx`) — plus the `meta.json` / `meta.<locale>.json` nav files. Read `src/lib/i18n.ts` for the language list + default (see generate-docs → *Multi-language output*). **Every page is audited**, not only the one the user named. Only narrow the set when the user explicitly scopes it to a page or section — an unscoped request ("werk de docs bij") means the whole site.

### 2. Detect drift per page — grounding in reverse
For **each** page, produce a **drift list** — every claim that no longer matches the code — using three passes. Delegate per-page research to subagents (absolute paths, the page, "return a drift list: doc-says → code-says-now → fix, and a severity per item"; include the graphify rule) to keep your context clean and make the research thorough.

- **Anchor on when the prose was written.** The metadata bar carries a `last-updated` date; confirm it with `git log -1 --format=%cs -- <docfile>`. Then diff the code that changed since: `git log -1 --format=%H -- <docfile>` → `git diff <that-sha>..HEAD -- apps/ packages/`. That surfaces exactly the renamed commands, new fields, and new capabilities added *after* the page — so you check the delta, not the whole repo blind.
- **Re-verify every checkable claim.** Walk the page's concrete values — commands, scripts, file paths, imports, endpoints + methods, function/DTO signatures, request/response shapes, `TypeTable` rows, config tables, ports, env vars — and confirm each still matches the current code / `package.json`. Every mismatch is drift.
- **Find coverage gaps.** Compare capabilities that exist in the code against what the page mentions; newly-added functionality the page omits is drift too (an addition, not a correction).

### 3. Classify and rate each page
- **Stale** — has a non-empty drift list. Assign a **severity** (worst item wins):
  - **high** — the page states something now false that a reader would act on and hit: a renamed/removed command, a wrong path/endpoint/flag, an incorrect value or response field.
  - **med** — a coverage gap: a real new capability the page doesn't mention (what's there is correct but incomplete).
  - **low** — cosmetic drift: a slightly-off description, a stale version/date reference, wording that no longer matches but nothing breaks.
- **Clean** — every claim re-verified, nothing drifted → nothing to do.
- **Undocumented feature** — functionality in the code with **no** page covering it → **do not create one.** Defer to `/project:generate-docs`.

### 4. Present the ranked audit list — then STOP
Show a **worst-first** list (high → med → low), one row per page, with just enough to triage — **not** the full drift detail and **not** diffs:

```
AUDIT — docs die aandacht nodig hebben (worst-first)

#   Status  Severity  Page                                Drift
1   ⚠       high      getting-started/start-your-project   3 claims — rename-Callout klopt niet meer; nieuw seed-commando ontbreekt
2   ⚠       med       index                                1 gap — nieuwe @repo/email package niet vermeld
    ✅                 (3 pages) up-to-date                 checked, no drift
    🆕                 <feature>                            no doc page — use /project:generate-docs
```

Each ⚠ row carries: status, severity, the page, the count of drifted claims, and a **one-line** summary of what's stale. List the clean pages compactly (so the user sees they were checked), and list undocumented features as 🆕 (deferred, not selectable). Then ask:

> Reply with the numbers to update — e.g. `1`, a range `1-2`, `all`, or `none`. ✅ pages need nothing; 🆕 features are generate-docs' job.

**Stop here and wait.** Nothing is patched, and no diff is prepared, until the user picks. This list is a valid end state on its own — a user who only wanted the audit has it.

---

## Checkpoint — the user picks

The user selects which ⚠ pages to update (`all`, a subset by number, or `none`). Only the selected pages go to Phase 2; unselected ⚠ pages are left exactly as they are, and 🆕 features stay deferred to generate-docs.

---

## Phase 2 — Patch the selected pages

For **each page the user picked** (and only those):

### 5. Prepare the surgical patch — full drift detail now
Surface the page's full drift detail (doc-says → code-says-now → the fix — the research from step 2), then produce a **minimal diff**, not a fresh page:
- **Change only the drifted spans.** Edit the exact command, path, field, row, or sentence that no longer matches; leave every still-true line **byte-for-byte** unchanged. For a new capability, add the sentences/section in the page's existing structure — don't restructure a page that's mostly right. Ground each corrected value once (generate-docs' rule); if you cannot verify it, write `{/* TODO: verify <what> */}` rather than guessing. (Regenerating a whole page from the skeleton is only for a page so heavily reworked that patching is more error-prone — the rare case — and even then keep the slug and the metadata bar.)
- **Keep the language siblings in lockstep.** Every change lands in both `<slug>.mdx` and `<slug>.nl.mdx`: grounded values (commands, paths, identifiers, field names) go into the `.nl.mdx` **verbatim** — never translated — and the surrounding prose gets the equivalent Dutch edit (plain-language recipe, in Dutch). If a selected page's `.nl.mdx` is **missing**, create it — otherwise the `/nl/...` route silently serves the (now-stale) default-language fallback.
- **Bump `last-updated` to today** (`date +%Y-%m-%d`) on **every page you changed**, in both language siblings — and only those. Update `applies-to` if the app/version it documents changed. Leave unselected and clean pages' stamps alone: bumping an unchanged page advertises false freshness.

### 6. Show the diffs and get approval
Present, before writing anything: the **actual changes as diffs** (old line → new line) in **both** languages for each selected page, including the `last-updated` bumps and any `meta.json` / `meta.<locale>.json` diffs — not full-page dumps. Apply the user's edits. **Only after explicit approval do you write to disk.**

### 7. Write, then ship as a draft PR
Write the edits. Then, on the branch/worktree where you made them:
- Commit **only the changed docs files** (pages + any `meta` files) — no `graphify-out/`, no unrelated changes.
- Push and open a **draft PR** against `develop`.
- Run `graphify update .` after writing so the graph reflects the changes.

### 8. Report
Per page: **updated** (+ a one-line what), **skipped** (⚠ but not picked), or **deferred to generate-docs** (undocumented feature). Plus any `TODO: verify` markers still open and the draft-PR link.

## Grounding in reverse — the core technique

A new page grounds forward: read the code, write the claim. An update grounds **backward**: read the claim the page already makes, then confirm the code still backs it.

| The page claims… | You must… |
|---|---|
| `pnpm --filter api seed` | Open `package.json` — is the script still named `seed`? If it's now `seed:roles`, that's drift → fix the exact span. |
| a response has `{ id, email, role }` | Read the current DTO — did a field get added/removed/renamed? |
| a `TypeTable` / config row with a default | Re-read the option's real default in code; defaults drift silently. |
| (nothing about a new command that now exists) | Coverage gap → med-severity drift; a missing capability counts. |

The `last-updated` stamp is your anchor: `git log -1 -- <docfile>` tells you when the prose was written, and the code diff since then is your shortlist of what to re-check.

## Never do this

- **Prepare patches or show diffs in Phase 1.** Phase 1 ends at the ranked list; building diffs before the user has picked is exactly the over-serving this two-phase split exists to prevent (step 4).
- **Patch a page the user didn't select.** Only the picked ⚠ pages get edited; unselected ones are left untouched (checkpoint).
- **Present a flat, unranked list with no severity.** The user triages by "hoe erg het is" — every ⚠ row needs a severity and the list is worst-first (steps 3–4).
- **Rewrite a page that's mostly correct.** A full regenerate clobbers hand-edits, drifts `en`/`nl` apart, and hides the real change in noise. Patch the drifted spans only (step 5).
- **Audit only the page the user named.** An unscoped "werk de docs bij" means research **every** page — catching the rot you weren't told about is the point (step 1).
- **Bump `last-updated` on a page you didn't change.** The stamp means "last time the content was made true" — a bump on unchanged content is a false freshness signal (step 5).
- **Edit the English page and leave the `.nl.mdx` stale**, or **translate a command/identifier** when patching the `.nl.mdx` — grounded values are byte-identical across languages, only prose is translated (step 5).
- **Create a page for an undocumented feature.** That's generate-docs. Report it and stop (step 3).
- **Commit `graphify-out/` or unrelated files** (step 7).

| Rationalization | Reality |
|---|---|
| "I've done the research — I'll just prepare the diffs too, to save a round-trip" | Phase 1 stops at the list. The user asked to pick before anything is patched; preparing diffs pre-empts that choice. |
| "They said update the docs — I'll just patch every stale page" | Present the ranked list and let them pick; patch only the selection. "Update the docs" starts with the list. |
| "Severity is subjective, I'll skip it" | Severity is how the user triages worst-first. Rate every ⚠ by the rubric (high/med/low). |
| "The page is stale enough — I'll regenerate it fresh" | Regenerating drifts the language files and wipes hand-edits. Patch the drifted spans; keep the rest byte-for-byte. |
| "I changed the English page, the Dutch one is basically the same" | "Basically" is how `/nl` ends up stale. Every edit lands in both siblings, in lockstep. |
| "The doc probably still matches, I'll leave the claim" | "Probably" isn't verified. Re-ground the claim against current code, or mark `{/* TODO: verify */}`. |

**Red flags — STOP:**
- About to prepare a diff or edit a file before the user has picked from the list.
- About to patch a page the user didn't select.
- About to present the audit list without a severity per page / not worst-first.
- About to replace a whole page instead of editing the drifted lines.
- About to change `<slug>.mdx` without the matching `<slug>.nl.mdx`.
- About to bump a `last-updated` on a page you didn't otherwise change.
- Writing a corrected value you didn't re-verify against the code.

## Quick reference

| Phase | Step | Key detail |
|------|------|------------|
| **1 Audit** | 1 Inventory | all `content/docs/**` (`.mdx` + `.nl.mdx`) + `meta`; read `i18n.ts`; whole site unless scoped |
| | 2 Detect drift (reverse grounding) | anchor on `last-updated` + `git log -1 -- <doc>` → `git diff`; re-verify every claim; coverage gaps; per-item severity |
| | 3 Classify + rate | stale (high/med/low) · clean · undocumented → defer |
| | 4 Ranked list → **STOP** | worst-first table: status·severity·count·one-line summary; no diffs; wait for pick |
| **Pick** | — | user replies `all` / numbers / `none`; only picked ⚠ pages proceed |
| **2 Patch** | 5 Surgical patch (picked only) | full drift detail; change only drifted spans; both langs lockstep; bump `last-updated` on changed only |
| | 6 Diffs → approve | old→new diffs both langs + meta diffs; write only after approval |
| | 7 Ship | commit docs only (no `graphify-out/`), push, draft PR → `develop`; `graphify update .` |
| | 8 Report | per page: updated / skipped / deferred; open TODOs + PR link |

## Common mistakes
- **Skipping the list and going straight to patches.** Phase 1 always leads with the ranked audit list and stops for the user to pick (step 4).
- **No severity / no ranking.** Every ⚠ page gets a high/med/low rating; the list is worst-first (steps 3–4).
- **Patching pages the user didn't pick**, or preparing diffs during Phase 1 (checkpoint / step 4).
- **Rewriting instead of patching.** Minimal diff on the drifted spans (step 5).
- **Auditing one page, not the whole site.** Unscoped "update the docs" = check them all (step 1).
- **Updating `en`, forgetting `nl`.** Both siblings move together; create a missing `.nl.mdx` (step 5).
- **Stamping unchanged pages.** Bump `last-updated` only on pages you actually edited (step 5).
- **Inventing pages for undocumented features.** Defer to generate-docs (step 3).
- **Trusting a claim without re-grounding it.** Re-verify every value against current code, or mark `{/* TODO: verify */}` (step 2).
- **Committing `graphify-out/` or unrelated files** (step 7).
