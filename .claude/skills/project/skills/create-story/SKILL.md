---
name: create-story
description: "Use when the user describes a feature or a bug in chat and wants it turned into an official Trello ticket — a story or a bug — placed on the project board's Backlog. Triggers on /project:create-story, \"maak hier een story van\", \"make a ticket\", \"log this bug\", \"zet dit op de backlog\"."
---

# /project:create-story

Turn a feature or bug the user describes in chat into a well-formed Trello ticket, grounded in the actual codebase, and post it to the **Backlog** column of the board configured in `CLAUDE.md`.

## Core principle

**A ticket is only as good as the research behind it.** You never research from the chat description alone, and you never research in your own context. Instead you **dispatch a small team of subagents**: three research agents run in parallel (one hunts existing code to reuse, one verifies the right technical choice against current docs, one gives the security & AVG (GDPR) verdict), you write the ticket from their findings, and then a fourth agent reviews the draft against the real codebase to catch anything wrong or **duplicate** before you show it. Only then do you preview and post.

## Two ticket types

| Type | When | Contains | Label |
|------|------|----------|-------|
| **Story** | New feature, change, or improvement | User story + context + acceptance criteria (checklist) | **blue** |
| **Bug** | Something is broken / behaves wrong | Description + reproduction steps + expected vs actual behaviour | **red** |

Decide from the user's words. Bug signals: "bug", "fout", "kapot", "werkt niet", "crasht", "error", "reproduce". Otherwise treat it as a story. **If genuinely ambiguous, ask one short question before continuing.**

## Language rule

Write the entire ticket (title, description, criteria, steps) in the **same language the user used to describe it**. Dutch description → Dutch ticket. English description → English ticket. Do not translate.

## Workflow

Do these in order. Two steps are **REQUIRED and non-negotiable**: step 2 (three research agents) and step 5 (review agent). Never write the ticket without the three research agents' findings; never preview it without the review agent's pass; never create the card until the user approves the preview in step 7.

### 1. Determine the type
Story or bug, per the signals above. Ask only if unclear.

### 2. Research — dispatch THREE agents in parallel — REQUIRED

**Do not do this research in your own context.** Dispatch three read-only subagents in a **single message** so they run concurrently, then wait for all three and synthesize their findings. Each agent owns ONE lens and returns findings only — **no agent edits code, writes the ticket, or creates a Trello card.**

Give every agent the feature/bug description and the repo context, plus its brief:

**Agent 1 — Codebase: what already exists, reuse before building.**
This project has a graphify knowledge graph. Have the agent run `graphify query "<the feature or bug>"` first for a scoped subgraph (use `graphify explain "<concept>"` / `graphify path "<A>" "<B>"` when useful), but **not over-trust it** — graphify can be noisy, so confirm exact files, functions, and current behaviour with `Grep`/`Read`. Mine prior art: search **git history and Prisma migrations** for related, removed, or half-built features before assuming anything must be built new. The mandate is **reuse**: hunt for an existing endpoint, flow, or mechanism to extend or unlock (e.g. relax a self-only guard for an admin, reuse the existing user-creation / temp-password flow) before proposing anything new.
*Returns:* affected files/modules as `path/to/file.ts:line`, how it currently works, **what can be reused**, constraints/edge cases, and whether new code is genuinely needed (with the reason).

**Agent 2 — Documentation: the right technical choice.**
When the ticket touches a library, framework, API, CLI, or cloud service, verify current best practice instead of relying on memory. Use **context7 first**: `mcp__plugin_context7_context7__resolve-library-id` → `mcp__plugin_context7_context7__query-docs`. **context7 runs on a free account and often hits rate limits** — if it is rate-limited, errors, or returns nothing useful, the agent must **fall back to a web search** (`WebSearch`, plus `WebFetch` on a specific page) on the same topic to reach the same answer. Reading the installed version from `package.json` is *not* research — that says what is installed, not how to use it well.
*Returns:* the verified approach / version / config / migration path / known pitfalls, with the source (context7 or the URLs used). If the ticket involves no external tech at all, it says so.

**Agent 3 — Security & AVG (GDPR).**
Give an explicit security and privacy verdict. Reason about **AVG / privacy** (which personal data is touched, retention, consent, any exposure or leakage) and **security** (authn/authz — who is allowed to do this, account-takeover paths, bypassed confirmation flows such as changing an email without re-confirmation, and destructive vs reversible actions). **Prefer reversible over destructive** (disable over hard-delete) and flag risky capabilities.
*Returns:* the security & AVG assessment for the ticket's **Security & AVG** section — if genuinely nothing applies, it says so explicitly with a reason.

### 3. Reconcile research with the request — before writing
The three agents exist precisely to catch these; do not march straight to writing:
- **Already implemented (fully or partly):** say so and show the code. Ask whether to skip, or reframe the ticket to the remaining gap.
- **A reusable path exists:** if an existing endpoint/flow covers most of it, reframe the ticket around extending that instead of building new.
- **Reality differs from the description:** if what the user described partly exists but behaves differently, surface the delta and confirm what to file (the delta as a story, or a bug if current behaviour is wrong) before writing.
- **Turns out to be a bug, not a story (or vice versa):** switch type and use the matching template.

### 4. Write the ticket
Use the matching template below. Fill the **Context** / **Betrokken code** from Agent 1 with real file references (`path/to/file.ts:line`), the **reuse** note from Agent 1, the informed technical choice from Agent 2, and the **Security & AVG** section from Agent 3. Every ticket carries the Security & AVG section — it is not optional.

### 5. Review the draft — dispatch a review agent — REQUIRED

Before previewing, dispatch **one** read-only subagent to review the **drafted ticket** against the actual codebase. Give it the full draft plus Agent 1's findings. It must NOT edit the ticket or create the card — it reports back. It checks:
- **Duplication — the primary job.** Are we about to build something that already exists? e.g. a new API route, endpoint, service, hook, or util proposed when one already exists and only needs extending. Call it out with the existing code's `path/to/file.ts:line`.
- **Reuse:** is there an existing flow the ticket should extend instead of adding new code?
- **Correctness:** do the file references, current-behaviour claims, and acceptance criteria actually match the code?

*Returns:* a list of issues (each with the offending part of the draft + the real code) or an explicit "no issues". If it finds issues, **fix the draft** — reframe around reuse, correct the references — and if the changes are substantial, run the review agent once more. Only proceed once the draft is clean.

### 6. Resolve the target board, Backlog list, and label
- Read the board name from `CLAUDE.md`, from the line under the `## trello` section formatted `trello: <bordnaam>`.
- If it is still the placeholder `<bordnaam>` or missing: ask the user which board to use, and offer to save it into `CLAUDE.md` so it's set for next time.
- `mcp__trello__list_boards` (filter `open`) → find the board whose `name` matches the configured name (case-insensitive). Keep its `id`.
- `mcp__trello__get_lists` with that `boardId` → find the list whose name is **Backlog** (case-insensitive). Keep its `id` (this is `idList` for the card).
- If no "Backlog" list exists, show the available lists and ask which column to use.
- `mcp__trello__trello_get_board_labels` with that `boardId` → pick the label by **colour**: `blue` for a story, `red` for a bug. Keep its `id`. If several share that colour, prefer one whose name matches ("story"/"bug"); otherwise take the first. If no label of that colour exists, mention it in the preview and ask whether to post without a label.

### 7. Preview + confirm — do NOT post yet
Show the full ticket in the chat: **title**, **body (rendered)**, **target board**, **target list (Backlog)**, and **label** (blue = story, red = bug). Ask the user to approve or edit. Only continue once they explicitly approve.

### 8. Create the card
`mcp__trello__create_card` with:
- `name` = ticket title
- `idList` = the Backlog list `id` from step 6
- `desc` = the markdown body
- `idLabels` = `[<label id>]` — the blue label for a story, the red label for a bug (from step 6). Omit only if no matching colour exists and the user approved posting without one.
- `pos` = `"top"` (newest on top of the backlog)

Report back the created card's URL.

## Templates

Templates shown in Dutch (default here); mirror the structure in the user's language — **including the section headings** (`## Acceptatiecriteria` in Dutch → `## Acceptance criteria` in English; `## Beveiliging & AVG` in Dutch → `## Security & privacy (GDPR)` in English). Never mix languages within one ticket.

### Story

```markdown
**Als** <rol>
**wil ik** <doel/functionaliteit>
**zodat** <waarde/reden>.

## Context
<Wat er nu gebeurt en waar het raakt, uit het codeonderzoek.>
Betrokken code: `apps/api/src/....ts:42`, `packages/....ts`.
Hergebruik: <bestaande endpoint/flow die we uitbreiden — of waarom nieuw écht nodig is>.

## Acceptatiecriteria
- [ ] <concreet, verifieerbaar punt>
- [ ] <randgeval / validatie>
- [ ] <zichtbaar resultaat voor de gebruiker>

## Beveiliging & AVG
- <authz: wie mag dit? privacy/AVG-impact, account-takeover-risico — of "Geen bijzondere impact" met reden>
```

### Bug

```markdown
## Omschrijving
<Wat er misgaat en waarom het een probleem is. Verwijs naar de betrokken code uit het onderzoek.>
Betrokken code: `apps/web/src/....tsx:88`.

## Reproductiestappen
1. <stap>
2. <stap>
3. <stap>

## Verwacht gedrag
<Wat er zou moeten gebeuren.>

## Werkelijk gedrag
<Wat er nu gebeurt.>

## Beveiliging & AVG
- <lekt of misbruikt deze bug persoonsgegevens of een autorisatie? — of "Geen bijzondere impact" met reden>
```

## Subagent dispatch — quick reference

| Step | Agents | Runs | Must NOT |
|------|--------|------|----------|
| 2. Research | 3 (codebase · docs · security/AVG) | in parallel, single message | edit code, write the ticket, create a card |
| 5. Review | 1 (duplication + correctness) | after the draft, before preview | edit the ticket, create a card |

Dispatch read-only agents. All four research/review agents report findings back to you; **you** write the ticket and (after approval) create the card. Note for code-exploring agents: graphify is mandatory in this repo — tell each of them to run `graphify query`/`explain`/`path` before reading raw source.

## Trello tools quick reference

| Step | Tool | Key args |
|------|------|----------|
| Find board | `mcp__trello__list_boards` | `filter: "open"` |
| Find Backlog list | `mcp__trello__get_lists` | `boardId` |
| Find story/bug label | `mcp__trello__trello_get_board_labels` | `boardId` → match `color` blue/red |
| Create ticket | `mcp__trello__create_card` | `name`, `idList`, `desc`, `idLabels`, `pos: "top"` |

**Credentials:** call these tools *without* `apiKey`/`token`. The Claude.app harness injects them automatically. (Their schema marks them `required`, but omitting them works — never ask the user for them.)

## Common mistakes

- **Researching in your own context instead of dispatching the three agents.** Step 2 fans out to three read-only subagents in parallel; doing it inline defeats the point and produces shallower research.
- **Skipping the review agent.** Step 5 is mandatory — it is what catches duplicate work (a new route/service when one already exists) before it reaches the board.
- **Letting a subagent create the card or edit the ticket.** Research and review agents only report back. You write the ticket; you post it after approval.
- **Writing the ticket before the agents return.** A ticket without real file references from Agent 1 is incomplete.
- **Reaching for new code first.** Default to reusing/extending existing endpoints and flows; propose new code only after Agent 1 shows why reuse won't work.
- **Skipping the security/AVG pass.** Every ticket carries the **Beveiliging & AVG** section (Agent 3) — even when the conclusion is "no special impact".
- **Guessing external tech instead of checking docs.** Agent 2 verifies via context7, then web search on a free-account limit — before the choice is baked into the ticket.
- **Posting before confirmation.** Always preview and wait for approval (step 7).
- **Wrong language.** Match the user's language exactly; don't translate to English.
- **Guessing the board or list.** The board comes from `CLAUDE.md` `trello:`; the list must be the real "Backlog". Ask if either is missing.
- **Using board id where a list id is needed.** `create_card` needs `idList` (the Backlog list), not the board id.
- **Wrong or missing label.** Story = blue, bug = red. Match by **colour**, not name — the board's default labels have empty names.
