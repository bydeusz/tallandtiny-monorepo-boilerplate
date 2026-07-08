# Graphify

This repo carries a **knowledge graph** of its own codebase, built and maintained with
[Graphify](https://github.com/Graphify-Labs/graphify). The graph lets an AI assistant
(and you) answer questions like *"what connects auth to the database?"* by traversing a
map of the code instead of grepping raw files.

The graph lives in `graphify-out/` and **is committed to git**, so every clone gets the
same up-to-date map — you do not have to rebuild it to start querying.

- Upstream project & docs: <https://github.com/Graphify-Labs/graphify>
- Currently pinned version in this repo: **0.8.41** (see `.claude/skills/graphify/.graphify_version`)

---

## What it is

Graphify parses a folder of code, docs, papers, images, or video into a queryable graph
of concepts and the relationships between them. For **code** it uses tree-sitter AST
parsing: deterministic, no LLM, no API cost, and nothing leaves your machine. For
**docs / PDFs / images** it uses an LLM (your Claude Code session) for semantic extraction.

What you get out of it:

| Concept | Meaning |
| --- | --- |
| **God nodes** | The most-connected concepts — the architectural hubs everything flows through. |
| **Communities** | Subsystems detected automatically (Leiden algorithm) and given plain-language labels. |
| **Cross-file edges** | `calls` / `imports` / `inherits` / `mixes_in` relationships resolved across files and languages. |
| **Confidence tags** | Every edge is `EXTRACTED` (explicit in source), `INFERRED` (derived by resolution), or `AMBIGUOUS`. |

## How it's wired into this project

There are **two entry points**, and it's important not to confuse them:

1. **The `/graphify` slash command** (Claude Code skill at `.claude/skills/graphify/SKILL.md`).
   This orchestrates the *full pipeline*: detect files → AST-extract code → dispatch
   subagents for semantic extraction of docs → cluster → label communities → generate
   outputs. Use this to **build or rebuild** the graph. It can cost tokens (the LLM part).

2. **The `graphify` CLI** (`~/.local/bin/graphify`, a headless Python tool).
   Use this for cheap, deterministic operations — `query`, `path`, `explain`, and the
   AST-only `update`. No subagents, no LLM for code.

The project's `CLAUDE.md` tells the assistant to **prefer the graph over raw browsing**:

> - For codebase questions, first run `graphify query "<question>"`.
> - Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
> - Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
> - After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

### What's in `graphify-out/`

| File | What it is |
| --- | --- |
| `graph.json` | The full queryable graph (source of truth for `query` / `path` / `explain`). |
| `graph.html` | Interactive visualization — open in a browser. |
| `GRAPH_REPORT.md` | Human-readable audit: god nodes, communities, surprising connections, suggested questions. |
| `manifest.json` | File fingerprints so `update` knows what changed. |
| `.graphify_python` | The Python interpreter path the skill resolved (so subsequent commands use the right one). |
| `.graphify_root` | The scan root, so `graphify update` with no path knows where to look. |
| `.graphify_labels.json` | Community labels for the visualizer. |
| `cost.json` | Cumulative token-cost tracker across builds. |
| `YYYY-MM-DD/` | Dated snapshots of previous builds. |

> **Note:** `graphify-out/` is tracked in git in this repo. When you rebuild or update the
> graph, commit the changed files so teammates get the fresh map. If you'd rather not
> commit it, add `graphify-out/` to `.gitignore` — but then everyone must build it locally.

---

## Installing graphify

The graph is committed, so you can **query without installing anything**… except the
`graphify` CLI itself must be on your machine to run `query` / `update`. Install it once:

```bash
# Recommended: uv (this is how it's installed in this project)
uv tool install graphifyy          # note the double-y: PyPI package is "graphifyy"

# Alternatives
pipx install graphifyy
pip  install graphifyy
```

> **Prerequisites:** Python 3.10+ and [`uv`](https://docs.astral.sh/uv/) (recommended) or `pipx`.
> The PyPI package is **`graphifyy`** (double y); the command it installs is **`graphify`**.

### Register the `/graphify` skill with your assistant

To get the `/graphify` slash command inside Claude Code:

```bash
graphify install                   # auto-detects your assistant
# or be explicit:
graphify claude install
graphify install --project         # install into THIS project only (recommended for a shared repo)
```

`--project` writes the skill into the repo's `.claude/` (which is why it's already here and
committed). A global `graphify claude install` would put it in your user config instead.

### Optional extras

Only needed if you extend the corpus beyond code:

```bash
uv tool install "graphifyy[pdf]"     # PDF ingestion
uv tool install "graphifyy[video]"   # local audio/video transcription (faster-whisper)
uv tool install "graphifyy[all]"     # everything
```

### Verify

```bash
graphify --version
which graphify        # should resolve, e.g. ~/.local/bin/graphify
```

---

## First-time setup / building the graph from scratch

If `graphify-out/` did not exist (fresh project, or you deleted it), build the graph with
the **slash command** from the repo root:

```
/graphify .
```

This runs the full pipeline and writes `graph.json`, `graph.html`, and `GRAPH_REPORT.md`
into `graphify-out/`. Useful variants:

```
/graphify . --mode deep        # thorough extraction, richer INFERRED edges
/graphify . --no-viz           # skip HTML, just report + JSON
/graphify . --update           # incremental: re-extract only new/changed files
```

> Building touches docs with the LLM, so it can cost tokens. Re-*building* code only is
> free (AST). See **Updating** below for the cheap path.

---

## Everyday use: querying the graph

You don't rebuild to ask questions — you query the existing `graph.json`. These run
against the committed graph and are cheap:

```bash
graphify query "how does auth talk to the database?"   # BFS traversal — broad context
graphify query "trace the request flow" --dfs           # DFS — follow one specific path
graphify query "..." --budget 1500                       # cap the answer at N tokens

graphify path "AuthModule" "Database"                    # shortest path between two concepts
graphify explain "VitestConfig"                          # plain-language explanation of one node
```

Inside Claude Code you can use the same via the skill: `/graphify query "..."`,
`/graphify path "A" "B"`, `/graphify explain "X"`. For broad architecture questions,
read `graphify-out/GRAPH_REPORT.md` instead of running a query.

---

## Updating the graph (manual commands)

After you change code, the graph goes stale. Keep it current with the **AST-only** update —
this is deterministic and **costs no tokens** because code never goes through the LLM:

```bash
graphify update .              # re-extract only new/changed code under the scan root
graphify update ./apps/api     # scope the update to a subfolder
```

Related maintenance commands:

```bash
graphify check-update .        # report what changed without rebuilding (dry run)
graphify watch .               # watch the folder and auto-rebuild on save (no LLM for code)
```

If you also changed **docs, PDFs, or images** (which need semantic/LLM extraction), run the
slash-command incremental build instead, so subagents re-read the changed docs:

```
/graphify . --update
```

> **Rule of thumb:** changed code only → `graphify update .` (free, CLI).
> Changed docs/images too → `/graphify . --update` (may cost tokens, via the skill).

After updating, **commit `graphify-out/`** so the shared graph stays in sync:

```bash
git add graphify-out && git commit -m "chore: graphify update"
```

### Auto-update on commit (optional)

Instead of remembering to update, install the git hook so the graph rebuilds after each commit:

```bash
graphify hook install          # add the post-commit auto-rebuild hook
graphify hook status           # check whether it's installed
graphify hook uninstall        # remove it
```

---

## Configuration

### Ignoring files

Create a `.graphifyignore` at the repo root (same syntax as `.gitignore`) to keep noise out
of the graph. This repo has none yet; a typical one:

```gitignore
node_modules/
dist/
.turbo/
*.generated.ts
```

### Environment variables

Only relevant for **headless / non-Claude** semantic extraction; the `/graphify` skill uses
your Claude Code session as the LLM and reads none of these except the Gemini keys.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Use Gemini for semantic extraction instead of subagents. |
| `GRAPHIFY_MAX_WORKERS` | AST parallelism. |
| `GRAPHIFY_API_TIMEOUT` | HTTP timeout (default 600s). |
| `GRAPHIFY_QUERY_LOG_DISABLE=1` | Silence query logging. |

> **Privacy:** code is parsed locally via tree-sitter with no API calls. Only docs / PDFs /
> images route through an LLM. No telemetry.

---

## Removing / uninstalling graphify

Uninstall the CLI and unregister the assistant integration:

```bash
graphify uninstall                          # remove skill registration
graphify uninstall --project                # remove it from THIS project only
graphify uninstall --purge                  # also delete the graphify-out/ graph data
```

Then remove the Python package itself:

```bash
uv tool uninstall graphifyy                 # if installed with uv (this project)
# or: pipx uninstall graphifyy
# or: pip uninstall graphifyy
```

To fully scrub it from the repo afterward:

```bash
rm -rf graphify-out
rm -rf .claude/skills/graphify              # the slash-command skill
git rm -r --cached graphify-out             # stop tracking it (if it was committed)
```

Finally, drop the graphify section from `CLAUDE.md` and `.claude/CLAUDE.md` so the assistant
stops expecting a graph.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `graphify: command not found` | Not installed, or `~/.local/bin` not on `PATH`. Run the install step above. |
| Query returns nothing / wrong answers | Graph is stale. Run `graphify update .`, or rebuild with `/graphify .`. |
| `graphify-out/graph.json` missing | Build it: `/graphify .` from the repo root. |
| Wrong Python interpreter errors | Delete `graphify-out/.graphify_python`; the skill re-resolves it on next run. |
| Graph has >5000 nodes, HTML is slow | `graphify export html` auto-aggregates to a community view; or rebuild with `--no-viz`. |

---

## Quick reference

```bash
# install
uv tool install graphifyy
graphify install --project

# build (full pipeline, via the skill in Claude Code)
/graphify .
/graphify . --mode deep
/graphify . --update

# query (cheap, uses committed graph.json)
graphify query "<question>"
graphify path "<A>" "<B>"
graphify explain "<concept>"

# update after code changes (AST-only, free)
graphify update .
graphify check-update .

# uninstall
graphify uninstall --purge
uv tool uninstall graphifyy
```
