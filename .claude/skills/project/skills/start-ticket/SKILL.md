---
name: start-ticket
description: "Use when the user wants to pick up / pull a ticket from the Trello board and start building it — pulls a story or bug card, moves it to the To Do column, records this Claude chat on the card so they can return to it, loads the full ticket, and starts TDD development. Triggers on /project:start-ticket, \"pak een ticket op\", \"start met dit ticket\", \"pull a ticket\", \"begin met ontwikkelen\"."
---

# /project:start-ticket

Pull a ticket from the project's Trello board and start developing it: move it from Backlog to **To Do**, stamp this Claude chat onto the card so the user can always come back, load the full ticket, and drive implementation test-first (TDD).

## Core principle

**The ticket is the spec.** Its acceptance criteria (story) or reproduction steps + expected behaviour (bug) drive the tests. Build nothing that isn't grounded in the ticket and in the actual code.

## Companion skill

This is the other half of `/project:create-story`: that skill files tickets into **Backlog**; this one pulls them out to build. Same board, resolved the same way (see step 1).

## Workflow

Do these in order. Steps 3–5 mutate Trello and git — do them only after the user has confirmed which ticket in step 1.

### 1. Select the ticket
- If the user named a card (title, URL, or id), use that.
- Otherwise resolve the board: read the board name from `CLAUDE.md` under the `## trello` section (`trello: <bordnaam>`); if it's the placeholder or missing, ask which board. Then `mcp__trello__list_boards` → board `id`, `mcp__trello__get_lists` → the **Backlog** list `id`.
- `mcp__trello__trello_get_list_cards` on the Backlog list → show the open cards (title + one-line excerpt) and ask the user which one to pick.
- Keep the chosen card's `id`.

### 2. Load the full ticket
`mcp__trello__get_card` with `includeDetails: true` → title, full description, and labels. Read it completely; this is the spec. Note the label colour: **blue = story**, **red = bug** (drives the branch prefix and the dev flow).

### 3. Stamp this chat onto the card
So the user can return to this exact dev chat later.
- Get the session id: run `echo "$CLAUDE_CODE_SESSION_ID"` (fallback: the UUID folder in the scratchpad path). Sessions resume with `claude --resume <id>`.
- `mcp__trello__update_card` with `desc` = the existing description **prepended** with one marker line, keeping the original body intact:
  ```
  > 🔗 Dev-chat: claude --resume <session-id>

  <original description>
  ```
- **Idempotent:** if a `> 🔗 Dev-chat:` line already exists (re-running on the same card), replace that line instead of stacking a second one.

### 4. Move the card to the To Do column
Move the card out of Backlog into the **To Do** column via `mcp__trello__get_lists` + `mcp__trello__move_card`.
- Match the list named **To Do** case-insensitively, ignoring spaces/hyphens (also accept `Todo`, `To-Do`). Fallback synonyms if there's no "To Do": `Doing`, `In Progress`, `WIP`.
- If nothing matches (or several do), show the lists and ask which column means "in progress".
- `mcp__trello__move_card` → `cardId`, `idList` = To Do list id, `pos: "top"`.

### 5. Create a branch for the ticket
- Base branch is `develop`. If the working tree is dirty, tell the user and ask before switching.
- Slug the ticket title (kebab-case, ascii, short). Prefix by type: **story → `feat/<slug>`**, **bug → `fix/<slug>`**.
- `git checkout develop` → (pull if a remote is configured) → `git checkout -b <prefix>/<slug>`.

### 6. Develop, test-first (TDD)
Research first, then let the ticket's criteria drive the tests.
- **Research the code:** `graphify query "<ticket topic>"` first, then confirm exact files/behaviour with `Grep`/`Read` (project rule).
- **Pick depth by ticket size/clarity:**
  - **Small & clear** (design obvious, ~≤3 acceptance criteria, localised change) → start coding test-first straight away.
  - **Large or unclear** (open design decisions, many criteria, cross-cutting, or vague) → sketch the design/plan with the user first, then start.
- **Drive implementation red → green → refactor:** turn each acceptance criterion (story) or the expected behaviour (bug) into a **failing test first**, make it pass with the smallest change, then refactor. Get the suite green before moving to the next criterion.
- When implementation is complete and the suite is green, **commit all work to the ticket branch**. Do **not** open a pull request — the user creates the PR themselves.

## Quick reference

| Step | Tool / command | Key args |
|------|----------------|----------|
| List Backlog cards | `mcp__trello__trello_get_list_cards` | `listId` (Backlog) |
| Load ticket | `mcp__trello__get_card` | `cardId`, `includeDetails: true` |
| Session id | `echo "$CLAUDE_CODE_SESSION_ID"` | — |
| Stamp chat on card | `mcp__trello__update_card` | `cardId`, `desc` (marker + original) |
| Move to To Do | `mcp__trello__move_card` | `cardId`, `idList` (To Do), `pos: "top"` |
| Branch | `git checkout -b feat/<slug>` | from `develop` |

**Credentials:** call the Trello tools *without* `apiKey`/`token` — the Claude.app harness injects them. Never ask the user for them.

## Common mistakes
- **Skipping the spec.** Don't start coding from a one-line summary; load the full card (step 2) and let its criteria drive the tests.
- **Overwriting the description.** `update_card` replaces `desc` wholesale — always include the original body, only prepend the marker line (step 3).
- **Stacking chat markers.** Replace an existing `> 🔗 Dev-chat:` line; don't add a second.
- **Coding on `develop`.** Always branch first (step 5).
- **Losing the TDD discipline.** This skill exists to start TDD, not to skip it — the ticket's acceptance criteria are your first failing tests.
- **Opening a PR.** Commit to the ticket branch only; never open a pull request — the user does that themselves.
