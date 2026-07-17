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

# Idempotency via a completion SENTINEL, not "node_modules exists". pnpm creates
# node_modules early during install, so an interrupted first run (a harness that
# does not wait for the synchronous hook, a cold store, Ctrl-C) leaves a partial
# node_modules AND no generated Prisma client — yet the old `[ -d node_modules ]`
# guard treated that as "done" and never repaired it. Keying the no-op on the
# sentinel instead makes a fully-set-up worktree skip (fast branch switches stay a
# no-op) while a fresh OR half-installed worktree falls through to the steps below,
# which are idempotent and therefore self-healing.
SENTINEL="$ROOT/node_modules/.worktree-setup-done"
if [ -f "$SENTINEL" ]; then
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

echo "[worktree-setup] Worktree nog niet compleet → bootstrap/herstel gestart (log: $LOG)" >&2

step() {
  echo "" >>"$LOG"
  echo ">>> $*" >>"$LOG"
  "$@" >>"$LOG" 2>&1
}

# All three steps are idempotent, so re-running after an interrupted attempt
# repairs the worktree: `pnpm install` finishes a partial node_modules,
# `db:generate` re-emits src/generated/prisma (gitignored → must exist per
# worktree), `build` re-emits dist/. The sentinel is written ONLY after all three
# succeed, so a failure leaves the worktree marked "not done" and the next run
# (a git checkout or `pnpm setup:worktree`) retries instead of skipping.
if step pnpm install --frozen-lockfile --prefer-offline \
  && step pnpm --filter @repo/database db:generate \
  && step pnpm --filter @repo/database build; then
  : >"$SENTINEL"
  echo "[worktree-setup] Klaar — node_modules + @repo/database gereed." >&2
else
  echo "[worktree-setup] FOUT tijdens bootstrap — zie $LOG (worktree als niet-klaar gemarkeerd; volgende run probeert opnieuw)" >&2
fi

# Never fail the checkout: git ignores the post-checkout exit code, but keep it
# explicit so a non-zero step never propagates.
exit 0
