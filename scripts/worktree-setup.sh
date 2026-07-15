#!/bin/sh
# worktree-setup.sh — bootstrap a fresh git worktree so it is ready to develop:
#   0) copy gitignored .env files from the main worktree
#   1) pnpm install
#   2) prisma generate (@repo/database)  -> src/generated/prisma
#   3) build @repo/database (tsc)         -> dist/ that re-exports the client
#
# Invoked synchronously from the post-checkout hook, so `git worktree add`
# (and the harness EnterWorktree, which uses it under the hood) BLOCKS until
# this finishes. That is what makes the agent wait for a ready worktree.
#
# Safe to run by hand too: `pnpm setup:worktree`.
set -u

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT" || exit 0

# --- Copy gitignored env files from the main worktree ------------------------
# .env* is gitignored, so a fresh checkout never gets them; without them the api,
# database and web apps fail on missing config. Copy every ignored env file from
# the main worktree to the same relative path here. Tracked *.env.example already
# came with the checkout (git check-ignore skips them); existing files are never
# overwritten. Runs before the node_modules guard, so re-running also repairs an
# already-installed worktree that is only missing env.
MAIN_ROOT=$(dirname "$(git rev-parse --git-common-dir 2>/dev/null)")
MAIN_ROOT=$(cd "$MAIN_ROOT" 2>/dev/null && pwd || true)
if [ -n "$MAIN_ROOT" ] && [ "$MAIN_ROOT" != "$ROOT" ] && [ -d "$MAIN_ROOT" ]; then
  find "$MAIN_ROOT" \
      \( -name node_modules -o -name .git -o -path '*/.claude/worktrees' -o -name graphify-out \) -prune \
      -o -type f \( -name '.env' -o -name '.env.*' \) -print 2>/dev/null \
  | while IFS= read -r src; do
      rel=${src#"$MAIN_ROOT"/}
      ( cd "$MAIN_ROOT" && git check-ignore -q "$rel" ) || continue  # skip tracked *.example
      dest="$ROOT/$rel"
      [ -e "$dest" ] && continue                                     # never clobber
      mkdir -p "$(dirname "$dest")"
      cp "$src" "$dest" && echo "[worktree-setup] env gekopieerd: $rel" >&2
    done
fi

# Fresh worktree/clone only. If node_modules already exists there is nothing to
# do (this also makes a normal branch switch a no-op).
if [ -d node_modules ]; then
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[worktree-setup] pnpm niet op PATH — bootstrap overgeslagen." >&2
  exit 0
fi

LOG="$ROOT/.worktree-setup.log"
# `prisma generate` reads env("DATABASE_URL"); a placeholder is enough — it does
# not connect to a database. Do not override a real DATABASE_URL if one is set.
export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/placeholder}"

echo "[worktree-setup] Verse worktree → bootstrap gestart (log: $LOG)" >&2

step() {
  echo "" >>"$LOG"
  echo ">>> $*" >>"$LOG"
  "$@" >>"$LOG" 2>&1
}

if step pnpm install --frozen-lockfile --prefer-offline \
  && step pnpm --filter @repo/database db:generate \
  && step pnpm --filter @repo/database build; then
  echo "[worktree-setup] Klaar — node_modules + @repo/database gereed." >&2
else
  echo "[worktree-setup] FOUT tijdens bootstrap — zie $LOG" >&2
fi

# Never fail the checkout: git ignores the post-checkout exit code, but keep it
# explicit so a non-zero step never propagates.
exit 0
