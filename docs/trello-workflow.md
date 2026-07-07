# Trello workflow (Claude Code skills)

This project ships two Claude Code skills that turn a Trello board into a lightweight
ticketing + development workflow:

- **`/project:create-story`** — turn a feature or bug you describe in chat into a researched Trello ticket in **Backlog**.
- **`/project:start-ticket`** — pull a ticket, move it to **To Do**, stamp the chat onto the card, and start TDD development.

This document explains how to set it up from scratch: the Trello MCP connection, the board you
need, the `CLAUDE.md` change, and how each skill behaves.

> Language note: the tickets themselves are written in whatever language you describe the work in
> (Dutch in → Dutch ticket, English in → English ticket). This doc is in English to match the rest of `docs/`.

---

## 1. Connect the Trello MCP

The skills call Trello through the **[Trello Desktop MCP](https://github.com/kocakli/trello-desktop-mcp)**
server (`kocakli/trello-desktop-mcp`), registered under the name **`trello`** — that's why the tools are
`mcp__trello__list_boards`, `mcp__trello__create_card`, … It exposes 19 tools (boards, lists, cards,
comments, checklists, labels, members).

**Prerequisites:** Node.js 18+, an active Trello account, and an MCP-capable client (Claude Code or
Claude Desktop).

### 1.1 Get a Trello API key + token
1. Sign in to Trello and open <https://trello.com/app-key>.
2. Copy your **API Key**.
3. Generate a **Token** with **read/write access, set to "never expires"** → copy the **token**.

Treat both as secrets — never commit them.

### 1.2 Build the server
```bash
git clone https://github.com/kocakli/trello-desktop-mcp.git
cd trello-desktop-mcp
npm install
npm run build
```
This produces `dist/index.js` — note its **absolute path**.

### 1.3 Register the server as `trello`
Point the client at `dist/index.js` and pass the credentials as env vars.

**Claude Code** — add it with the CLI:
```bash
claude mcp add trello \
  --env TRELLO_API_KEY=<your-key> \
  --env TRELLO_TOKEN=<your-token> \
  -- node /absolute/path/to/trello-desktop-mcp/dist/index.js
```
…or add the JSON block by hand to `~/.claude.json` (global) or a project `.mcp.json`:
```json
{
  "mcpServers": {
    "trello": {
      "command": "node",
      "args": ["/absolute/path/to/trello-desktop-mcp/dist/index.js"],
      "env": {
        "TRELLO_API_KEY": "<your-key>",
        "TRELLO_TOKEN": "<your-token>"
      }
    }
  }
}
```

**Claude Desktop** — the same block, in `claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

The server name **must be `trello`** so the skills find the `mcp__trello__*` tools.

### 1.4 Restart & verify
Restart the client to load the server. Then run `/mcp` in Claude Code (it should list `trello` as
connected), or just ask _"list my Trello boards"_. If your boards come back, you're set.

Once connected, the skills call the Trello tools **without** passing `apiKey`/`token` — the client
injects the stored credentials for you, so you never paste secrets into chat.

---

## 2. Create the board

> ⚠️ The Trello MCP here can create **cards** and **lists**, but it **cannot create a board, nor
> rename or delete a list**. So create the board and its columns yourself in the Trello UI — that
> keeps things clean (no leftover default columns the tools can't remove).

1. In Trello, **create a new board** for the project (start from a blank board so it has no default
   lists).
2. Add exactly these four columns (lists), left to right:

   | Order | Column     | Meaning                                   |
   |-------|------------|-------------------------------------------|
   | 1     | **BACKLOG**| New tickets land here (`/project:create-story`).  |
   | 2     | **TO DO**  | Picked up / in progress (`/project:start-ticket`).|
   | 3     | **TESTING**| Implemented, awaiting test/review.        |
   | 4     | **DONE**   | Finished.                                 |

   The column names are matched case-insensitively, so `BACKLOG` / `Backlog` both work. `/project:start-ticket`
   also accepts `Doing` / `In Progress` / `WIP` as fallbacks for the "in progress" column, but **TO DO**
   is the canonical name.
3. **Labels** — `/project:create-story` colours tickets by type:
   - **blue** label = **story**
   - **red** label = **bug**

   Trello's default label palette already includes a blue and a red label (they can be nameless — the
   skill matches by **colour**, not name), so you usually don't need to add anything. If your board has
   no blue or red label, add them once in the UI.

---

## 3. Point the project at your board (`CLAUDE.md`)

The skills read the board name from the repo's root **`CLAUDE.md`**, under a `## trello` section:

```markdown
## trello

The `/project:create-story` skill posts tickets to this Trello board. Set the board name below, exactly as it
appears in Trello (replace the placeholder).

trello: <bordnaam>
```

**Change `<bordnaam>` to your board's exact name**, e.g.:

```markdown
trello: monorepo-boilerplate
```

That single line is all you need to configure — both `/project:create-story` and `/project:start-ticket` resolve the
board from it. If it's still the `<bordnaam>` placeholder, the skills will ask you which board to use
(and offer to save it).

> The skill **triggers** themselves live in `.claude/CLAUDE.md` (one block per skill, already checked
> in). You don't need to touch those; they tell Claude to launch the skill when you type
> `/project:create-story` or `/project:start-ticket`.

---

## 4. How the skills work

### `/project:create-story` — file a ticket
Describe a feature or bug in chat, then run `/project:create-story` (or say "maak hier een story van" / "log
this bug"). The skill:

1. **Classifies** it as a **story** (feature/change) or a **bug** (something broken).
2. **Researches the code** — it inspects the actual codebase (graphify + grep/read) so the ticket
   references real files and current behaviour. If the feature already exists or differs from your
   description, it tells you and asks how to proceed instead of writing a naive ticket.
3. **Writes the ticket** in your language:
   - **Story** → user story (*Als … wil ik … zodat …*) + `Context` + `Acceptatiecriteria` (checklist).
   - **Bug** → `Omschrijving` + `Reproductiestappen` + expected vs actual behaviour.
4. **Resolves** the board (from `CLAUDE.md`), the **Backlog** list, and the label (blue/red).
5. **Previews** the full ticket and waits for your approval — nothing is posted before you say yes.
6. **Creates** the card at the top of **Backlog** with the right label, and returns its URL.

### `/project:start-ticket` — pick up a ticket and build it
Run `/project:start-ticket` (or "pak een ticket op" / "start met dit ticket"). The skill:

1. **Selects** the ticket — name one, or it lists the Backlog cards and asks which.
2. **Loads** the full card (title, description, acceptance criteria / repro steps, label).
3. **Stamps this chat onto the card** — it prepends a line to the card description:
   `> 🔗 Dev-chat: claude --resume <session-id>` so you can always jump back to the exact chat where
   the ticket was built (`claude --resume <id>`). Re-running replaces the line, never stacks it.
4. **Moves** the card from Backlog to **TO DO**.
5. **Creates a branch** off `develop` — `feat/<slug>` for a story, `fix/<slug>` for a bug.
6. **Develops test-first (TDD)** — researches the code, turns each acceptance criterion into a failing
   test, then red → green → refactor. For small/clear tickets it starts immediately; for large/unclear
   ones it plans with you first.
7. **Commits** everything to the ticket branch when the suite is green. It **does not open a PR** — you
   create the pull request yourself.

---

## 5. Day-to-day flow

```
describe feature/bug in chat
        │
        ▼
   /project:create-story ──► ticket in BACKLOG (blue=story / red=bug)
        │
        ▼
   /project:start-ticket ──► card → TO DO, chat stamped on card, feat|fix branch off develop
        │
        ▼
   TDD development ──► commits on the branch
        │
        ▼
   you open the PR, move the card to TESTING / DONE in Trello
```

---

## 6. Known limitations (this MCP)

- **No board creation** — make the board in the Trello UI (section 2).
- **No list rename/delete** — set the four columns up correctly in the UI once; the tools can add a
  missing list but can't remove or rename Trello's default columns.
- **Labels can't be created via MCP** — the default blue/red labels are used; add them in the UI if a
  board somehow lacks them.
- **Moving cards to TESTING/DONE and opening PRs is manual** — by design; the skills stop after
  committing to the branch.
```
