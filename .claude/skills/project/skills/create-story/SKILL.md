---
name: create-story
description: "Use when the user describes a feature or a bug in chat and wants it turned into an official Trello ticket — a story or a bug — placed on the project board's Backlog. Triggers on /project:create-story, \"maak hier een story van\", \"make a ticket\", \"log this bug\", \"zet dit op de backlog\"."
---

# /project:create-story

Turn a feature or bug the user describes in chat into a well-formed Trello ticket, grounded in the actual codebase, and post it to the **Backlog** column of the board configured in `CLAUDE.md`.

## Core principle

**A ticket is only as good as the research behind it.** You ALWAYS investigate the code first and fold what you find into the ticket. Never write a ticket from the chat description alone.

## Two ticket types

| Type | When | Contains | Label |
|------|------|----------|-------|
| **Story** | New feature, change, or improvement | User story + context + acceptance criteria (checklist) | **blue** |
| **Bug** | Something is broken / behaves wrong | Description + reproduction steps + expected vs actual behaviour | **red** |

Decide from the user's words. Bug signals: "bug", "fout", "kapot", "werkt niet", "crasht", "error", "reproduce". Otherwise treat it as a story. **If genuinely ambiguous, ask one short question before continuing.**

## Language rule

Write the entire ticket (title, description, criteria, steps) in the **same language the user used to describe it**. Dutch description → Dutch ticket. English description → English ticket. Do not translate.

## Workflow

Do these in order. Never skip step 2, and never create the card until the user approves the preview in step 5.

### 1. Determine the type
Story or bug, per the signals above. Ask only if unclear.

### 2. Research the codebase — REQUIRED
This project has a graphify knowledge graph. Follow the project rule, but don't over-trust it:
- Run `graphify query "<the feature or bug>"` first (scoped subgraph). Use `graphify explain "<concept>"` or `graphify path "<A>" "<B>"` when useful.
- `graphify query` can be noisy or off-target — **always confirm the exact files, functions, and current behaviour with `Grep`/`Read`.** Grep/Read are first-class here, not a fallback.

Capture: which files/modules are affected (`path/to/file.ts:line`), how it currently works, and any constraints or edge cases. This is what makes the ticket concrete — reference it in the ticket body.

**Reconcile research with the request before writing.** Research exists precisely to catch these — do not march straight to writing:
- **Already implemented (fully or partly):** say so and show the code. Ask whether to skip, or reframe the ticket to the remaining gap.
- **Reality differs from the description:** if what the user described partly exists but behaves differently, surface the delta and confirm what to file (the delta as a story, or a bug if current behaviour is wrong) before writing.
- **Turns out to be a bug, not a story (or vice versa):** switch type and use the matching template.

### 3. Write the ticket
Use the matching template below. Fill the **Context** / **Betrokken code** parts from step 2 with real file references (`path/to/file.ts:line`).

### 4. Resolve the target board, Backlog list, and label
- Read the board name from `CLAUDE.md`, from the line under the `## trello` section formatted `trello: <bordnaam>`.
- If it is still the placeholder `<bordnaam>` or missing: ask the user which board to use, and offer to save it into `CLAUDE.md` so it's set for next time.
- `mcp__trello__list_boards` (filter `open`) → find the board whose `name` matches the configured name (case-insensitive). Keep its `id`.
- `mcp__trello__get_lists` with that `boardId` → find the list whose name is **Backlog** (case-insensitive). Keep its `id` (this is `idList` for the card).
- If no "Backlog" list exists, show the available lists and ask which column to use.
- `mcp__trello__trello_get_board_labels` with that `boardId` → pick the label by **colour**: `blue` for a story, `red` for a bug. Keep its `id`. If several share that colour, prefer one whose name matches ("story"/"bug"); otherwise take the first. If no label of that colour exists, mention it in the preview and ask whether to post without a label.

### 5. Preview + confirm — do NOT post yet
Show the full ticket in the chat: **title**, **body (rendered)**, **target board**, **target list (Backlog)**, and **label** (blue = story, red = bug). Ask the user to approve or edit. Only continue once they explicitly approve.

### 6. Create the card
`mcp__trello__create_card` with:
- `name` = ticket title
- `idList` = the Backlog list `id` from step 4
- `desc` = the markdown body
- `idLabels` = `[<label id>]` — the blue label for a story, the red label for a bug (from step 4). Omit only if no matching colour exists and the user approved posting without one.
- `pos` = `"top"` (newest on top of the backlog)

Report back the created card's URL.

## Templates

Templates shown in Dutch (default here); mirror the structure in the user's language — **including the section headings** (`## Acceptatiecriteria` in Dutch, `## Acceptance criteria` in English). Never mix languages within one ticket.

### Story

```markdown
**Als** <rol>
**wil ik** <doel/functionaliteit>
**zodat** <waarde/reden>.

## Context
<Wat er nu gebeurt en waar het raakt, uit het codeonderzoek.>
Betrokken code: `apps/api/src/....ts:42`, `packages/....ts`.

## Acceptatiecriteria
- [ ] <concreet, verifieerbaar punt>
- [ ] <randgeval / validatie>
- [ ] <zichtbaar resultaat voor de gebruiker>
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
```

## Trello tools quick reference

| Step | Tool | Key args |
|------|------|----------|
| Find board | `mcp__trello__list_boards` | `filter: "open"` |
| Find Backlog list | `mcp__trello__get_lists` | `boardId` |
| Find story/bug label | `mcp__trello__trello_get_board_labels` | `boardId` → match `color` blue/red |
| Create ticket | `mcp__trello__create_card` | `name`, `idList`, `desc`, `idLabels`, `pos: "top"` |

**Credentials:** call these tools *without* `apiKey`/`token`. The Claude.app harness injects them automatically. (Their schema marks them `required`, but omitting them works — never ask the user for them.)

## Common mistakes

- **Writing the ticket before researching the code.** Step 2 is mandatory; a ticket without real file references is incomplete.
- **Posting before confirmation.** Always preview and wait for approval (step 5).
- **Wrong language.** Match the user's language exactly; don't translate to English.
- **Guessing the board or list.** The board comes from `CLAUDE.md` `trello:`; the list must be the real "Backlog". Ask if either is missing.
- **Using board id where a list id is needed.** `create_card` needs `idList` (the Backlog list), not the board id.
- **Wrong or missing label.** Story = blue, bug = red. Match by **colour**, not name — the board's default labels have empty names.
