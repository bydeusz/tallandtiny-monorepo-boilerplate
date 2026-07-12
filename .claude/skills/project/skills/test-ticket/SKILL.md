---
name: test-ticket
description: "Use when a ticket built via /project:start-ticket needs to be verified end-to-end in a real browser against its acceptance criteria, using the installed Playwright MCP, and driven to all-green. Triggers on /project:test-ticket, \"test dit ticket\", \"test het ticket met playwright\", \"verifieer dit ticket end-to-end\", \"run the e2e for this ticket\"."
---

# /project:test-ticket

Verify a ticket that was built (via `/project:start-ticket`) end-to-end in a real browser with the **Playwright MCP**, and drive every acceptance criterion to green.

## Core principle

**A criterion is green only when the browser actually proves it — and you never drive the browser or fix code yourself.** The ticket's acceptance criteria plus its **Beveiliging & AVG** section are the spec. You orchestrate a small team, in sequence: a **scenario-writer** writes the scenarios to a file, the engineer reads and approves them, a **runner** executes them and reports green/red, and a **fixer** repairs the code behind each red. Then you re-run the reds and loop until every scenario is green. A small ticket is not an excuse to collapse this into inline work — that is exactly the shortcut to resist.

## Companion skills

`/project:create-story` files the ticket (with acceptance criteria + **Beveiliging & AVG**); `/project:start-ticket` builds it and moves the card **Backlog → To Do**; this one verifies it and moves the card **To Do → Testing**. Same board and card — resolve them the way `start-ticket` does.

## The Playwright MCP

Installed via the **`playwright@claude-plugins-official`** plugin (server `playwright`, `@playwright/mcp@latest`). Its tools are namespaced **`mcp__plugin_playwright_playwright__browser_*`** — e.g. `browser_navigate`, `browser_snapshot` (accessibility tree — the primary way to *read* the page), `browser_click`, `browser_type`, `browser_fill_form`, `browser_wait_for`, `browser_take_screenshot`, `browser_console_messages`, `browser_evaluate`. If the server is registered under a different name, adjust the prefix. **Only the runner agent calls these — one browser, one driver at a time; never run two runners at once.**

## Workflow

In order. The scenario-writer (5), runner (7), and fixer (8) are the REQUIRED agent loop; the engineer approves the scenarios at **step 6 before any browser run**. Do not collapse the loop into inline work, however small the ticket looks.

### 1. See what actually changed — unless the chat already shows it
**If you built this ticket earlier in this same chat, you already have the diff in context — skip to step 2.** Otherwise, before trusting the ticket wording, find out what was *really* implemented. In the ticket's branch or worktree, run `git log <base>..HEAD` and `git diff <base>...HEAD` (base is usually `develop`) and read the changed files. Capture a short **"what changed"** summary — the real button label, route guard, cookie/session/endpoint names, `path/to/file.ts:line` — and carry it into the scenario-writer (step 5) and the fixer (step 8).

This also guards a trap: where the real implementation reasonably differs from the ticket's literal wording (e.g. the button reads "Log out", not "Uitloggen"), **surface that difference** instead of letting the fixer rewrite working code to satisfy a pedantic reading of the ticket.

### 2. Get the ticket and its spec
Resolve the ticket the way `start-ticket` does — the current dev chat/branch usually maps to one card; otherwise the user names it. `mcp__trello__get_card` with `includeDetails: true` → the full description. Extract **both** the acceptance criteria **and** the **Beveiliging & AVG** section: together they are the spec you test against.

### 3. Move the card to Testing
Verification is starting, so move the card out of **To Do** into the **Testing** column, mirroring how `start-ticket` advances it into To Do.
- `mcp__trello__get_lists` on the board → find the list named **Testing** (case-insensitive, ignoring spaces/hyphens; also accept `Test`, `QA`, `In Testing`, `Ready for Testing`).
- If nothing matches (or several do), show the lists and ask which column means "in testing".
- `mcp__trello__move_card` → `cardId`, `idList` = Testing list id, `pos: "top"`.
- Call the Trello tools *without* `apiKey`/`token` — the harness injects them.

### 4. Prepare the environment — REQUIRED before any browser run
You cannot test what you cannot reach.
- **App under test:** derive it from the ticket's *Betrokken code* and the changed files from step 1 (e.g. `apps/web`, `apps/dashboard`, `apps/website`).
- **Run it:** find the app's dev command + port (`package.json` / `turbo.json`); if the dev server isn't already up, start it in the background and wait until it responds. Capture the **base URL**.
- **Test data & tokens — the database is a first-class source; don't fabricate data.** Prisma lives in **`@repo/database`**.
  - **Seed users:** run `pnpm db:seed` (or `pnpm --filter @repo/database db:seed`). It creates ready-to-use active users — at time of writing `john.doe@bydeusz.com` and `lisa.visser@bydeusz.com`, both password `Admin123!`. Prefer logging in as a seeded user over inventing an account. *(Verify the current seed in `packages/database/prisma/seeders/`.)*
  - **Tokens minted by a flow live in the DB — read them there, don't guess.** Registration mints a plaintext 6-digit `ActivationCode.code`; an email change mints `EmailChangeRequest.token`. Read the value with a quick Prisma query/script, or eyeball it in **Prisma Studio** (`pnpm --filter @repo/database db:studio`, port 5555) — the same row the engineer inspects. So "create an account → read its token from the DB/Studio → continue the flow" is a supported precondition.
  - **Caveats:** `RefreshToken` stores only a bcrypt *hash* (not recoverable); a password-reset temp password exists only in the outgoing mail, not the DB.
- If you cannot get the app running or cannot authenticate, **stop and report** — don't fake a run. (The card stays in Testing, flagged as blocked.)

### 5. Write the scenario handoff to a file — dispatch the scenario-writer agent
Dispatch **one** agent to turn the ticket into a **self-contained Playwright handoff** and **write it to `docs/testing/<ticket-slug>.md`** (slug from the ticket title; overwrite/update on a re-run). The file is the artifact the engineer reviews and the runner executes — it must stand alone without the ticket. Cover:
- **one scenario per acceptance criterion**, plus
- the **Beveiliging & AVG** section wherever it is browser-observable (e.g. "after logout, a protected page redirects to /login"), plus
- **obvious edge cases** (empty/invalid input, validation messages, unauthorised access).

Each scenario is `{ id, goal, preconditions (logged in as…, at URL…), steps (concrete browser actions), expected result (what proves it green) }`. Give the writer the base URL from step 4, the **data/token sources from step 4** (seed users, DB/Studio tokens — so preconditions name real seeded users and real token sources, not invented ones), and the **"what changed" summary from step 1**; tell it to ground preconditions in the real routes/selectors that were actually built (graphify → Read). **For a security criterion the DOM can't show** (e.g. server-side session invalidation), it must specify the closest observable check — re-request a protected route, inspect cookies/console via `browser_evaluate`, or flag it explicitly as a code-level check. *Returns:* the file path + a one-line summary (scenario count + coverage).

Example scenario shape (as written in the file):
```
S3  Beschermde pagina na uitloggen
    pre:   ingelogd als john.doe@bydeusz.com / Admin123! (seed), op /dashboard
    steps: click "Uitloggen" → browser_wait_for url=/login → browser_navigate /dashboard
    green: url is /login (niet /dashboard); geen dashboard-inhoud in snapshot
```

### 6. Review the scenarios with the engineer — approve before running
**Do not run anything yet.** Show the engineer the file path `docs/testing/<ticket-slug>.md` and the one-line summary, and ask them to **read it — and edit the file if they want — then approve**. Wait for explicit approval. The runner executes the scenarios **from the file**, so any edits the engineer makes are honoured. Only once they approve do you continue to step 7.

### 7. Run the scenarios — dispatch the runner agent (green/red)
Dispatch **one** runner agent that drives the Playwright MCP through the scenarios in `docs/testing/<ticket-slug>.md` **in order, from a clean state** (fresh session + login each run; use the seed users / DB tokens from step 4). It calls only `mcp__plugin_playwright_playwright__browser_*` tools. For each scenario it records **green** (expected result observed) or **red** (not), with evidence: a `browser_snapshot`/`browser_take_screenshot` and what actually happened. **It fixes nothing and never marks a scenario green without observing the expected result.** *Returns:* a green/red table; every red carries its concrete failure.

### 8. Fix the reds — dispatch a fixer agent, then re-run — loop until green
While any scenario is red:
- Dispatch a **fixer** agent for the failing scenario(s). Mandate: **the acceptance criteria are the source of truth — fix the code so the scenario passes.** Start from the "what changed" summary (step 1). Change a *scenario* only if it demonstrably misreads the ticket (and say so). Ground the fix in the code (graphify → Read), make the smallest change, report what changed and why (`file:line`). Where a red is only a mismatch between a working implementation and the ticket's literal wording — not a real defect — **surface it for a decision rather than rewriting working code to the letter of the ticket.** The fixer does **not** touch the browser or mark anything green.
- **Re-run the previously-red scenarios** via the runner (step 7) to confirm they are now green.
- Repeat.

**Safety — no infinite loops, no pretend-green:**
- Cap at **3 fix→re-run rounds per scenario**.
- Never mark a scenario green without a passing runner result.
- If a scenario is still red after the cap, **stop and report it with the fixer's diagnosis**. A genuine architectural gap (e.g. there is no server-side session revocation at all) is something to *surface*, not paper over.
- When the failing set is green, do **one final full run** (step 7 over *all* scenarios) to catch regressions the fixes introduced.

### 9. Report
Present the final green/red table (all green on success), a link to `docs/testing/<ticket-slug>.md`, the evidence, and every fix the fixer made (`file:line` + why). If anything is still red after the cap, report it honestly with the diagnosis and the recommended next step. **This skill verifies and fixes, and leaves the card in Testing; it does not move the card to Done, commit, or open a PR** — those stay in the developer's flow, as with `start-ticket`.

## Agent roles — quick reference

| Step | Agent | Does | Must NOT |
|------|-------|------|----------|
| 5 | scenario-writer | writes the self-contained handoff to `docs/testing/<ticket>.md` from the ticket + what-changed diff | drive the browser · edit product code · run the scenarios |
| 7 | runner | executes the scenario file via the Playwright MCP, reports green/red + evidence | fix code · mark green without proof · share the browser with another runner |
| 8 | fixer | fixes the **code** behind red scenarios | drive the browser · rewrite a scenario (unless it misreads the ticket) · pretend-green |

The engineer reviews and approves the scenario file at **step 6**, between the writer and the runner. The agents run **sequentially**, not in parallel: one file → approval → one runner (one browser) → fixer → re-run. Agents that touch code must run graphify first (repo rule): `graphify query "<topic>"` before reading raw source.

## Playwright MCP tools quick reference

| Need | Tool |
|------|------|
| Open a URL | `mcp__plugin_playwright_playwright__browser_navigate` |
| Read the page (accessibility tree) | `mcp__plugin_playwright_playwright__browser_snapshot` |
| Click / type / fill | `browser_click` · `browser_type` · `browser_fill_form` |
| Wait for state/URL | `browser_wait_for` |
| Evidence | `browser_take_screenshot` · `browser_console_messages` |
| Read cookies / run JS | `browser_evaluate` |

Prefer `browser_snapshot` over screenshots for assertions — it gives the runner structured, assertable content.

## Common mistakes

- **Running before the engineer has approved the scenarios.** The scenarios go to `docs/testing/<ticket>.md` first (step 5) and the engineer reads/edits and approves them (step 6) before any browser run — that gate is the whole point of writing them to a file.
- **Keeping scenarios in context instead of writing the file.** The runner executes the file, so the engineer's edits are honoured; scenarios that live only in your head can't be reviewed.
- **Fabricating test data.** Use seed users (`pnpm db:seed`) and read minted tokens from the DB / Prisma Studio (step 4) rather than inventing accounts or guessing tokens.
- **Leaving the card in To Do.** Move it to Testing when verification starts (step 3).
- **Testing the ticket's wording instead of the built code.** When you didn't build it in this chat, inspect the diff first (step 1) so scenarios and fixes reconcile with what was actually implemented.
- **Doing it all inline "because the ticket is small."** The write→approve→run→fix loop is REQUIRED; a small ticket is not an exception — that rationalization *is* the failure mode this skill exists to stop.
- **Pretend-green.** A scenario is green only when the runner observed its expected result. Never infer green from "the code looks right".
- **Fixing the scenario instead of the code.** Criteria are the source of truth; fix the code. Touch a scenario only when it demonstrably misreads the ticket.
- **Running the browser before the app is up or before you can log in.** Prepare the environment first (step 4).
- **Looping forever.** Cap the rounds; surface a real architectural gap instead of hacking to green.
- **Two browsers at once.** One runner, one browser, sequential — parallel drivers corrupt each other's state.
