---
name: start-ticket
description: "Use when the user names a specific ticket from the Trello board they want to pick up and start building — it loads that card, records this Claude chat on it, moves it to the To Do column, and sets up an isolated workspace (git worktree or branch) ready to develop in. Triggers on /project:start-ticket <ticket>, \"pak ticket <naam> op\", \"start met ticket <naam>\", \"pull ticket <naam>\"."
---

# /project:start-ticket

Get a **named** ticket ready to build: load the card, stamp this Claude chat onto it, move it from Backlog to **To Do**, and create an isolated workspace (a git worktree or a branch) on `develop`. Then hand off to development.

## Core principle

**This skill gets a ticket ready to build and then hands off — it does not prescribe how you develop.** How you build (TDD, plugin workflows, plain coding) is the developer's choice and depends on their toolchain. What this skill guarantees is a clean starting point: the right card in To Do, this chat linked on it, and a fresh workspace on `develop`. The ticket's acceptance criteria (story) or expected behaviour (bug) are the spec you hand over.

## Companion skill

This is the other half of `/project:create-story`: that skill files tickets into **Backlog**; this one pulls a chosen one out and preps the workspace. Same board, resolved the same way (see step 1).

## Workflow

Do these in order. Steps 3–5 mutate Trello and git — do them only after the user has confirmed the matched card in step 1.

### 1. Select the named ticket
The user names the ticket with the command (`/project:start-ticket <title / URL / id>`). Resolve it — don't browse the Backlog for them:
- Resolve the board: read the board name from `CLAUDE.md` under the `## trello` section (`trello: <bordnaam>`); if it's the placeholder or missing, ask which board. `mcp__trello__list_boards` (filter `open`) → board `id`.
- Find the card: by URL/id directly, or match the title against the board's cards (`mcp__trello__trello_search` scoped to the board, or `mcp__trello__trello_get_board_cards`).
- **If the user named no ticket, ask which one** (title / URL / id). Do not list the whole Backlog and pick for them.
- If several cards match or none do, show the candidates and ask.
- Confirm the matched card with the user before any mutation, then keep its `id`.

### 2. Load the full ticket
`mcp__trello__get_card` with `includeDetails: true` → title, full description, and labels. Read it completely; this is the spec you hand off. Note the label colour: **blue = story**, **red = bug** (drives the branch prefix in step 5).

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

### 5. Create the workspace — worktree or branch
First derive the name: slug the ticket title (kebab-case, ascii, short) and prefix by type — **story → `feat/<slug>`**, **bug → `fix/<slug>`**. Base is always `develop`.

**Choose worktree vs. branch by whether the superpowers plugin is installed.** You can tell from your own environment: superpowers is present if its `superpowers:*` skills are available to you this session (or `~/.claude/plugins/` contains a `superpowers` entry). Check, then:
- **superpowers installed → create a git worktree.** Its development workflow expects an isolated worktree, so give it one: create a worktree on a new branch `<prefix>/<slug>` based on `develop` (e.g. `git worktree add <path> -b <prefix>/<slug> develop`, or the harness's worktree tool). Report the worktree path.
- **superpowers not installed → create a plain branch.** If the working tree is dirty, tell the user and ask before switching. `git checkout develop` → (pull if a remote is configured) → `git checkout -b <prefix>/<slug>`.

### 6. Hand off to development
The ticket is now in **To Do**, this chat is stamped on the card, and the workspace is ready on `develop`. Report the concrete state back to the user — the card, the To Do list, and the worktree path or branch name — and hand off:

> Everything's set up. Build it however you work — if superpowers is installed, its development workflow takes over from here. The ticket's acceptance criteria (story) or expected behaviour (bug) are your spec.

This skill stops here. It does **not** write code, run tests, commit, or open a PR — that belongs to the developer's own flow.

## Quick reference

| Step | Tool / command | Key args |
|------|----------------|----------|
| Find board | `mcp__trello__list_boards` | `filter: "open"` |
| Find the named card | `mcp__trello__trello_search` / `mcp__trello__trello_get_board_cards` | board scope, match title (or resolve URL/id) |
| Load ticket | `mcp__trello__get_card` | `cardId`, `includeDetails: true` |
| Session id | `echo "$CLAUDE_CODE_SESSION_ID"` | — |
| Stamp chat on card | `mcp__trello__update_card` | `cardId`, `desc` (marker + original) |
| Move to To Do | `mcp__trello__move_card` | `cardId`, `idList` (To Do), `pos: "top"` |
| Workspace (superpowers) | `git worktree add <path> -b <prefix>/<slug> develop` | worktree on new branch |
| Workspace (no superpowers) | `git checkout -b <prefix>/<slug>` | branch from `develop` |

**Credentials:** call the Trello tools *without* `apiKey`/`token` — the Claude.app harness injects them. Never ask the user for them.

## Common mistakes
- **Browsing the Backlog instead of using the named ticket.** The user names the ticket; resolve that card. If they named none, ask — don't list the whole Backlog and pick for them (step 1).
- **Mutating before confirming the match.** A title match can be ambiguous; confirm the card before steps 3–5 touch Trello or git.
- **Overwriting the description.** `update_card` replaces `desc` wholesale — always include the original body, only prepend the marker line (step 3).
- **Stacking chat markers.** Replace an existing `> 🔗 Dev-chat:` line; don't add a second (step 3).
- **Ignoring superpowers when choosing the workspace.** Worktree if superpowers is installed, plain branch if not — don't default to a branch without checking (step 5).
- **Prescribing how to develop.** This skill hands off after workspace setup; it does not drive TDD, write code, commit, or open a PR. The developer (or their plugin workflow) owns that.
