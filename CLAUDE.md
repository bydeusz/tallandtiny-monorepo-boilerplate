## trello

The `/project:create-story` skill posts tickets to this Trello board. Set the board name below, exactly as it appears in Trello (replace the placeholder).

trello: monorepo-boilerplate

## Worktrees
- This project uses pnpm, never npm.
- Worktree setup is automated: a post-checkout hook runs `scripts/worktree-setup.sh`
  synchronously on `git worktree add` (copy .env files → pnpm install →
  @repo/database generate+build), so a new worktree is ready to use immediately.
  The hook installs itself via the `prepare` script on `pnpm install`; install it
  manually with `pnpm setup:hooks`. Fallback if the hook isn't active yet (e.g. right
  after the very first clone): run `pnpm setup:worktree` inside the worktree.
- Worktrees live in .worktrees/ (same filesystem → pnpm hardlinks keep working).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
