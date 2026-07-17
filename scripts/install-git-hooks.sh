#!/bin/sh
# install-git-hooks.sh — idempotently wire the worktree-setup trampoline into
# the shared post-checkout hook, so a fresh worktree bootstraps itself.
#
# - Writes to the SHARED hooks dir (git rev-parse --git-common-dir/hooks) so it
#   works when run from any linked worktree and applies to all of them.
# - Coexists with the graphify post-checkout hook: our block is prepended after
#   the shebang, before graphify's block, and never calls `exit`.
# - Idempotent: a no-op once our markers are present.
#
# Wired via the root package.json `prepare` script, so `pnpm install` after a
# clone activates it. Also runnable by hand: `pnpm setup:hooks`.
set -u

START="# worktree-setup-hook-start"
END="# worktree-setup-hook-end"
# Bump when the BLOCK below changes so an already-installed OLDER block is
# rewritten instead of skipped (the installer keys idempotency on this marker).
VERSION="# worktree-setup-hook v2"

COMMON=$(git rev-parse --git-common-dir 2>/dev/null) || {
  echo "[install-git-hooks] geen git repo — overgeslagen." >&2
  exit 0
}
# --git-common-dir may be relative to the current directory; make it absolute.
case "$COMMON" in
  /*) ;;
  *) COMMON="$(pwd)/$COMMON" ;;
esac
HOOKS_DIR="$COMMON/hooks"
HOOK="$HOOKS_DIR/post-checkout"

mkdir -p "$HOOKS_DIR"

# Already installed at the current version → nothing to do.
if [ -f "$HOOK" ] && grep -qF "$VERSION" "$HOOK"; then
  exit 0
fi

# An OLDER block is present (START marker but not the current VERSION): strip it
# from START..END so the current block is (re)installed below. Portable across
# BSD/GNU sed (no in-place flag): filter to a temp file, then swap.
if [ -f "$HOOK" ] && grep -qF "$START" "$HOOK"; then
  if sed "/$START/,/$END/d" "$HOOK" >"$HOOK.tmp"; then
    mv "$HOOK.tmp" "$HOOK"
    echo "[install-git-hooks] oude worktree-setup hook vervangen." >&2
  else
    rm -f "$HOOK.tmp"
  fi
fi

# The trampoline. Runs synchronously (blocks `git worktree add`) and only on a
# fresh worktree (branch-checkout flag set, no node_modules yet). Does not `exit`
# so any later hook block (e.g. graphify) still runs.
BLOCK=$(cat <<'EOF'
# worktree-setup-hook-start
# worktree-setup-hook v2
# Bootstrap a fresh worktree (pnpm install + @repo/database) BEFORE anything else.
# Synchronous on purpose: `git worktree add` blocks until the worktree is ready.
# Guard on the completion sentinel, not "node_modules exists": a worktree whose
# first bootstrap was interrupted has node_modules but no sentinel, so this keeps
# re-running setup (which is idempotent) on each checkout until it fully succeeds.
if [ "$3" = 1 ] && [ ! -f node_modules/.worktree-setup-done ]; then
  _wt_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [ -n "$_wt_root" ] && [ -x "$_wt_root/scripts/worktree-setup.sh" ]; then
    "$_wt_root/scripts/worktree-setup.sh"
  fi
fi
# worktree-setup-hook-end
EOF
)

if [ -f "$HOOK" ]; then
  first=$(head -n 1 "$HOOK")
  rest=$(tail -n +2 "$HOOK")
  case "$first" in
    '#!'*)
      # Keep the existing shebang, insert our block right after it.
      printf '%s\n%s\n%s\n' "$first" "$BLOCK" "$rest" >"$HOOK.tmp"
      ;;
    *)
      # No shebang present: add one, then our block, then the original content.
      printf '#!/bin/sh\n%s\n%s\n%s\n' "$BLOCK" "$first" "$rest" >"$HOOK.tmp"
      ;;
  esac
  mv "$HOOK.tmp" "$HOOK"
else
  printf '#!/bin/sh\n%s\n' "$BLOCK" >"$HOOK"
fi

chmod +x "$HOOK"
echo "[install-git-hooks] worktree-setup trampoline geïnstalleerd in $HOOK" >&2
