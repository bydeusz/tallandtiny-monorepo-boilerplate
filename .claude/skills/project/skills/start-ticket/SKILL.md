---
name: start-ticket
description: "Use when the user names a specific ticket from the Trello board they want to pick up and start building — it loads that card, records this Claude chat on it, moves it to the To Do column, and sets up a branch (or hands off to superpowers for an isolated worktree) ready to develop in. Triggers on /project:start-ticket <ticket>, \"pak ticket <naam> op\", \"start met ticket <naam>\", \"pull ticket <naam>\"."
---

# /project:start-ticket

Get a **named** ticket ready to build: load the card, stamp this Claude chat onto it, move it from Backlog to **To Do**, and get it into an isolated dev workspace on `develop`. Then hand off to development.

## Core principle

**This skill gets a ticket ready to build and then hands off — it does not run the development itself.** It guarantees a clean starting point: the right card in **To Do**, this chat linked on it, and either a fresh `feat/`/`fix/` branch on `develop` **or** a clean hand-off to superpowers (which brainstorms, plans, and sets up its own worktree). It doesn't dictate your coding methodology — but when you hand off to superpowers, its **spec (brainstorming)** and **plan (writing-plans)** phases are part of that flow and must not be skipped just because the ticket is well-written.

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

### 5. Set up the workspace — branch, or leave it to superpowers
Detect whether the **superpowers** plugin is installed: its `superpowers:*` skills are available to you this session, or `~/.claude/plugins/` contains a `superpowers` entry. Then:

- **superpowers installed → do NOT create a branch or worktree here.** Leave the workspace to superpowers: its flow brainstorms and plans first, then creates and names its **own** isolated worktree via `superpowers:using-git-worktrees` (which prefers the native worktree tool). **Don't pre-create a `feat/…` worktree** — the `feat/`/`fix/` naming is only for the branch method below, and pre-creating one both fights superpowers' worktree tooling and forces a branch name it wouldn't choose. Go straight to step 6.
- **superpowers not installed → create a plain branch.** Slug the ticket title (kebab-case, ascii, short) and prefix by type — **story → `feat/<slug>`**, **bug → `fix/<slug>`**. If the working tree is dirty, tell the user and ask before switching. `git checkout develop` → (pull if a remote is configured) → `git checkout -b <prefix>/<slug>`. *(The `feat/`/`fix/` prefix applies only to this branch method.)*

### 6. Hand off to development
The ticket is in **To Do** and this chat is stamped on the card. Report the concrete state — the card, the To Do list, and (if you created one) the branch name — then hand off:

- **superpowers installed →** hand off *into the superpowers flow, starting at brainstorming*. Be explicit that it runs **`superpowers:brainstorming`** (turn the ticket into a spec) and then **`superpowers:writing-plans`** (the implementation plan) **before writing any code**, and that superpowers creates its own isolated worktree as part of that flow. **A thoroughly-written ticket is not a reason to skip brainstorming or planning** — the acceptance criteria are the *input* to brainstorming, not a substitute for it. For example:
  > Card's in To Do and this chat is linked on it. Handing off to superpowers — start with brainstorming (spec), then writing-plans, even though the ticket is detailed: the acceptance criteria are the input to the spec, not a replacement for it. It sets up its own worktree and drives TDD from there.
- **superpowers not installed →** the branch `<prefix>/<slug>` is ready on `develop`. Build it however you work; the ticket's acceptance criteria (story) or expected behaviour (bug) are your spec.

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
| Workspace — superpowers | *(none — hand off; superpowers brainstorms → plans → makes & names its own worktree)* | no `feat/`/`fix/` here |
| Workspace — no superpowers | `git checkout -b feat/<slug>` (story) · `fix/<slug>` (bug) | branch from `develop` |

**Credentials:** call the Trello tools *without* `apiKey`/`token` — the Claude.app harness injects them. Never ask the user for them.

## Common mistakes
- **Browsing the Backlog instead of using the named ticket.** The user names the ticket; resolve that card. If they named none, ask — don't list the whole Backlog and pick for them (step 1).
- **Mutating before confirming the match.** A title match can be ambiguous; confirm the card before steps 3–5 touch Trello or git.
- **Overwriting the description.** `update_card` replaces `desc` wholesale — always include the original body, only prepend the marker line (step 3).
- **Stacking chat markers.** Replace an existing `> 🔗 Dev-chat:` line; don't add a second (step 3).
- **Putting `feat/`/`fix/` on a worktree.** That prefix is only for the plain-branch method (no superpowers). With superpowers, don't create or name a worktree yourself — hand off and let superpowers create and name its own (step 5).
- **Skipping brainstorming/planning because the ticket is detailed.** A well-written ticket is the *input* to superpowers' brainstorming (spec) and writing-plans, not a replacement — route the hand-off into those phases; don't jump straight to coding (step 6).
- **Doing the development yourself.** This skill hands off; it does not write code, run tests, commit, or open a PR. It routes the hand-off into superpowers' brainstorming/planning, but the building itself is the developer's flow.
