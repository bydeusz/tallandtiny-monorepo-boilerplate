---
name: test-ticket
description: "Use when a ticket built via /project:start-ticket needs to be verified end-to-end in a real browser against its acceptance criteria, using the installed Playwright MCP, and driven to all-green. Triggers on /project:test-ticket, \"test dit ticket\", \"test het ticket met playwright\", \"verifieer dit ticket end-to-end\", \"run the e2e for this ticket\"."
---

# /project:test-ticket

Verify a ticket that was built (via `/project:start-ticket`) end-to-end in a real browser with the **Playwright MCP**, and drive every acceptance criterion to green.

## Core principle

**A criterion is green only when the browser actually proves it — and you never drive the browser or fix code yourself.** The ticket's acceptance criteria plus its **Beveiliging & AVG** section are the spec. You orchestrate a small team, in sequence: a **scenario-writer** turns the ticket into a Playwright handoff, a **runner** executes that handoff and reports green/red, and a **fixer** repairs the code behind each red. Then you re-run the reds and loop until every scenario is green. A small ticket is not an excuse to collapse this into inline work — that is exactly the shortcut to resist.

## Companion skills

`/project:create-story` files the ticket (with acceptance criteria + **Beveiliging & AVG**); `/project:start-ticket` builds it and sets up the workspace; this one verifies it. Same board and card — resolve them the way `start-ticket` does.

## The Playwright MCP

Installed via the **`playwright@claude-plugins-official`** plugin (server `playwright`, `@playwright/mcp@latest`). Its tools are namespaced **`mcp__plugin_playwright_playwright__browser_*`** — e.g. `browser_navigate`, `browser_snapshot` (accessibility tree — the primary way to *read* the page), `browser_click`, `browser_type`, `browser_fill_form`, `browser_wait_for`, `browser_take_screenshot`, `browser_console_messages`, `browser_evaluate`. If the server is registered under a different name, adjust the prefix. **Only the runner agent calls these — one browser, one driver at a time; never run two runners at once.**

## Workflow

In order. Steps 4–6 (**write → run → fix**) are the REQUIRED agent loop. Do not fold them into your own context, however small the ticket looks.

### 1. See what actually changed — unless the chat already shows it
**If you built this ticket earlier in this same chat, you already have the diff in context — skip to step 2.** Otherwise, before trusting the ticket wording, find out what was *really* implemented. In the ticket's branch or worktree, run `git log <base>..HEAD` and `git diff <base>...HEAD` (base is usually `develop`) and read the changed files. Capture a short **"what changed"** summary — the real button label, route guard, cookie/session/endpoint names, `path/to/file.ts:line` — and carry it into the scenario-writer (step 4) and the fixer (step 6).

This also guards a trap: where the real implementation reasonably differs from the ticket's literal wording (e.g. the button reads "Log out", not "Uitloggen"), **surface that difference** instead of letting the fixer rewrite working code to satisfy a pedantic reading of the ticket.

### 2. Get the ticket and its spec
Resolve the ticket the way `start-ticket` does — the current dev chat/branch usually maps to one card; otherwise the user names it. `mcp__trello__get_card` with `includeDetails: true` → the full description. Extract **both** the acceptance criteria **and** the **Beveiliging & AVG** section: together they are the spec you test against.

### 3. Prepare the environment — REQUIRED before any browser run
You cannot test what you cannot reach.
- **App under test:** derive it from the ticket's *Betrokken code* and the changed files from step 1 (e.g. `apps/web`, `apps/dashboard`, `apps/website`).
- **Run it:** find the app's dev command + port (`package.json` / `turbo.json`); if the dev server isn't already up, start it in the background and wait until it responds. Capture the **base URL**.
- **Auth:** work out how to log in if the flow needs it (seed script, `.env`/`.env.local`, a register flow, a documented dev user). Without a way to log in you cannot exercise authenticated criteria.
- If you cannot get the app running or cannot authenticate, **stop and report** — don't fake a run.

### 4. Write the scenario handoff — dispatch the scenario-writer agent
Dispatch **one** agent to turn the ticket into a **self-contained Playwright handoff**: a numbered list of scenarios the runner can execute without re-reading the ticket. Cover:
- **one scenario per acceptance criterion**, plus
- the **Beveiliging & AVG** section wherever it is browser-observable (e.g. "after logout, a protected page redirects to /login"), plus
- **obvious edge cases** (empty/invalid input, validation messages, unauthorised access).

Each scenario is `{ id, goal, preconditions (logged in as…, at URL…), steps (concrete browser actions), expected result (what proves it green) }`. Give the writer the base URL from step 3 **and the "what changed" summary from step 1**, and tell it to ground preconditions in the real routes/selectors that were actually built (graphify → Read) — scenarios assert the real implementation, not just the ticket's wording. **For a security criterion the DOM can't show** (e.g. server-side session invalidation), it must specify the closest observable check — re-request a protected route, inspect cookies/console via `browser_evaluate`, or flag it explicitly as a code-level check for the fixer/runner. *Returns:* the scenario list.

Example scenario shape:
```
S3  Beschermde pagina na uitloggen
    pre:   ingelogd als testuser, op /dashboard
    steps: click "Uitloggen" → browser_wait_for url=/login → browser_navigate /dashboard
    green: url is /login (niet /dashboard); geen dashboard-inhoud in snapshot
```

### 5. Run the scenarios — dispatch the runner agent (green/red)
Dispatch **one** runner agent that drives the Playwright MCP through the handoff **in order, from a clean state** (fresh session + login each run). It calls only `mcp__plugin_playwright_playwright__browser_*` tools. For each scenario it records **green** (expected result observed) or **red** (not), with evidence: a `browser_snapshot`/`browser_take_screenshot` and what actually happened. **It fixes nothing and never marks a scenario green without observing the expected result.** *Returns:* a green/red table; every red carries its concrete failure.

### 6. Fix the reds — dispatch a fixer agent, then re-run — loop until green
While any scenario is red:
- Dispatch a **fixer** agent for the failing scenario(s). Mandate: **the acceptance criteria are the source of truth — fix the code so the scenario passes.** Start from the "what changed" summary (step 1). Change a *scenario* only if it demonstrably misreads the ticket (and say so). Ground the fix in the code (graphify → Read), make the smallest change, report what changed and why (`file:line`). Where a red is only a mismatch between a working implementation and the ticket's literal wording — not a real defect — **surface it for a decision rather than rewriting working code to the letter of the ticket.** The fixer does **not** touch the browser or mark anything green.
- **Re-run the previously-red scenarios** via the runner (step 5) to confirm they are now green.
- Repeat.

**Safety — no infinite loops, no pretend-green:**
- Cap at **3 fix→re-run rounds per scenario**.
- Never mark a scenario green without a passing runner result.
- If a scenario is still red after the cap, **stop and report it with the fixer's diagnosis**. A genuine architectural gap (e.g. there is no server-side session revocation at all) is something to *surface*, not paper over.
- When the failing set is green, do **one final full run** (step 5 over *all* scenarios) to catch regressions the fixes introduced.

### 7. Report
Present the final green/red table (all green on success), the scenarios and their evidence, and every fix the fixer made (`file:line` + why). If anything is still red after the cap, report it honestly with the diagnosis and the recommended next step. **This skill verifies and fixes; it does not commit or open a PR** — that stays in the developer's flow, as with `start-ticket`.

## Agent roles — quick reference

| Step | Agent | Does | Must NOT |
|------|-------|------|----------|
| 4 | scenario-writer | writes the self-contained Playwright handoff from the ticket + what-changed diff | drive the browser · edit code |
| 5 | runner | executes the handoff via the Playwright MCP, reports green/red + evidence | fix code · mark green without proof · share the browser with another runner |
| 6 | fixer | fixes the **code** behind red scenarios | drive the browser · rewrite a scenario (unless it misreads the ticket) · pretend-green |

The three run **sequentially**, not in parallel: one handoff → one runner (one browser) → fixer → re-run. Agents that touch code must run graphify first (repo rule): `graphify query "<topic>"` before reading raw source.

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

- **Testing the ticket's wording instead of the built code.** When you didn't build it in this chat, inspect the diff first (step 1) so scenarios and fixes reconcile with what was actually implemented — and so a working implementation that merely differs from the ticket's phrasing isn't "fixed" away.
- **Doing it all inline "because the ticket is small."** The write→run→fix agents are REQUIRED; a small ticket is not an exception — that rationalization *is* the failure mode this skill exists to stop.
- **No scenario handoff.** The runner executes a written, self-contained handoff — not an ad-hoc click-through you improvise.
- **Pretend-green.** A scenario is green only when the runner observed its expected result. Never infer green from "the code looks right".
- **Fixing the scenario instead of the code.** Criteria are the source of truth; fix the code. Touch a scenario only when it demonstrably misreads the ticket.
- **Running the browser before the app is up or before you can log in.** Prepare the environment first (step 3).
- **Looping forever.** Cap the rounds; surface a real architectural gap instead of hacking to green.
- **Skipping the security/AVG scenarios.** They're in scope wherever browser-observable; use `browser_evaluate` / a side-channel / a code-level check when the DOM can't show it.
- **Two browsers at once.** One runner, one browser, sequential — parallel drivers corrupt each other's state.
