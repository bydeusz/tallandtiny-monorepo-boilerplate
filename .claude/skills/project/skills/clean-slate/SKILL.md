---
name: clean-slate
description: "Use when the user wants to clean up their dev environment — tear down git worktrees (they pick which ones from a list, including worktrees that are in use) and remove the superpowers folders (the tracked docs/superpowers/ and the gitignored .superpowers/ scratch) for a fresh start. Triggers on /project:clean-slate, \"ruim mijn worktrees op\", \"gooi worktrees weg\", \"laat me kiezen welke worktrees weg mogen\", \"clean slate\", \"opschonen\", \"reset mijn omgeving\", \"verwijder superpowers\", \"clean up my worktrees\"."
---

# /project:clean-slate

Tear down git worktrees and remove the two superpowers folders — the tracked `docs/superpowers/` (specs + plans) and the gitignored `.superpowers/` scratch — to get back to a clean environment. **You surface every worktree with an honest status; the user picks which ones to remove — and you never silently destroy work or the session you're running in.**

## Core principle

**"Clean everything" doesn't mean "the skill decides," and it doesn't mean "force-delete everything silently."** A worktree can hold uncommitted work, unpushed commits, or a *live Claude session* — all invisible until you look. So this skill **inspects every worktree, presents them as a numbered list with a plain status/warning on each, and lets the user choose which to remove** — including worktrees that are in use, because the user may legitimately want them gone. What the skill guarantees: nothing is removed unless the user selected it; any worktree carrying a warning (dirty, unpushed, or a live session) is called out *before* removal and force-removed only after the user confirms **that specific one**; and the worktree this very session runs in is never removed (you'd kill the session you're using to clean up). It never uses `git stash` to "rescue" work — the stash stack is shared across worktrees.

## The two worktree directories — one set, not two

A worktree shows up in two places, and they are **the same worktree**, not two things to clean separately:
- `.claude/worktrees/<name>/` — the actual **working copy** (the files you edit).
- `.git/worktrees/<name>/` — git's internal **admin metadata** (HEAD, index, locks) for that same working copy.

`git worktree remove <path>` deletes **both** — the working copy *and* its `.git/worktrees/<name>/` admin dir. `git worktree prune` sweeps any **stale** admin dirs left behind when a working copy was deleted by hand (`rm -rf`) instead of through git. So you make `.git/worktrees/` clean by removing worktrees the git way and then pruning — **never** by `rm`-ing admin dirs yourself (that corrupts git's bookkeeping). When you're done, `.git/worktrees/` should hold an entry only for each **surviving** worktree; verify that (step 7).

## Repo specifics you must know

- **`graphify-out/` is rebuild noise, not work.** A post-commit hook regenerates `graphify-out/` in every worktree, so nearly every worktree shows as "dirty" even when its real work is committed and pushed. A worktree whose **only** uncommitted changes are under `graphify-out/` (plus ignored files like `.DS_Store`) is **effectively clean** — mark it clean, not dirty. Filtering this noise is the difference between a useful status list and one where every row looks scary.
- **The git stash stack is shared** across all worktrees and other sessions. Never `git stash` to park dirty work — it surfaces in the other sessions. Preserving a dirty worktree's work is the user's call (a commit on its own branch), never something this skill stashes away.
- **Active sessions show as `locked`.** `git worktree list --porcelain` marks worktrees with a live session as `locked`. Locked means *someone is using it* — surface it with a warning, but it's still removable if the user picks it (except the current session's own — see below).
- **Two different superpowers folders — different handling.** `docs/superpowers/` holds design **specs + plans**, is **git-tracked**, and is removed with `git rm -r` (gone from disk *and* future commits) + a commit. `.superpowers/` is the plugin's local **scratch/log** (task briefs, subagent reports, review diffs), is **gitignored and untracked**, and is removed with `rm -rf` (git is not involved; it regenerates on the next superpowers run). Don't cross the wires: `git rm` on the untracked scratch errors, and `rm -rf` on the tracked docs leaves phantom deletions.

## Workflow

Do these in order. **Nothing is removed until the user has picked from the list and confirmed (steps 4–5).**

### 1. Operate from the main checkout — and remember your own worktree
You cannot remove the worktree this session is running in. Capture its path **before** you move, then switch to the main working tree:
```bash
CUR="$(git rev-parse --show-toplevel)"                                          # this session's worktree — always protected
cd "$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"      # first entry = main checkout
```

### 2. Inventory the worktrees
```bash
git worktree list --porcelain
```
This is the authoritative list: each worktree's path, `branch`, and a `locked` line when a session holds it.

### 3. Inspect every worktree — build one honest status flag per worktree
For **each** worktree under `.claude/worktrees/`, gather the observable signals — you'll fold them into the list in step 4:
```bash
git worktree list --porcelain | awk '/^worktree /{print $2}' | grep '/\.claude/worktrees/' | while read -r wt; do
  echo "== $wt =="
  [ "$wt" = "$CUR" ] && echo "  FLAG: current session (protected)"
  git worktree list --porcelain | awk -v p="$wt" '$0=="worktree "p{f=1} f&&/^locked/{print "  FLAG: locked (live session)"} /^$/{f=0}'
  git -C "$wt" status --porcelain | grep -v '^.. graphify-out/' | grep . && echo "  FLAG: uncommitted work (outside graphify-out)" || echo "  clean apart from graphify-out"
  git -C "$wt" log --branches --not --remotes --oneline | grep . && echo "  FLAG: unpushed commits" || true
done
```
Read the output yourself and reduce each worktree to a single status:
- **🔒 current session** — the worktree this chat runs in (`$CUR`). *Protected: cannot be removed from here.*
- **⚠ live session (locked)** — another running session. Removing it may break that session and lose its unsaved work.
- **⚠ uncommitted work** — real changes outside `graphify-out/`. Force-removing loses them.
- **⚠ unpushed commits** — commits not on the remote and not merged to `origin/develop`. Force-removing loses them.
- **✓ clean** — nothing but `graphify-out/`/ignored noise, and pushed or merged. Safe to remove normally.

A worktree can carry more than one ⚠ — show the ones that apply.

### 4. Present the numbered list and let the user pick
Show **all** worktrees as a numbered table so the user can select — this is the point of the skill, not an agent-decided remove/skip split:

```
#   Worktree                        Branch                          Status
1   auth-ui-shared-components       worktree-auth-ui-…              ✓ clean · pushed
2   create-story-desc-field         worktree-create-story-…        ⚠ uncommitted work outside graphify-out
3   worktree-auto-install           worktree-auto-install          ⚠ live session (locked)
…
14  <this session's dir>            <branch>                        🔒 current session — can't remove from here
```

Then ask, plainly:
> Reply with the numbers to remove — e.g. `1 4 7`, a range `1-5`, `all`, or `none`.
> Rows marked ⚠ will be **force-removed** and can lose unsaved or unpushed work — I'll confirm each of those with you before deleting it.
> Row 🔒 (this session) can't be removed from here; run clean-slate from another session if you want it gone.

Do not pre-filter the ⚠ rows out of the menu — the user asked to be able to pick in-use ones. Just make the warning on each unmissable.

### 5. Confirm — especially each flagged worktree the user picked
For every **✓ clean** worktree the user selected, no extra prompt is needed. For each **⚠** worktree the user selected, restate its specific risk once and get a final go before force-removing it:
> `create-story-desc-field` has uncommitted work outside graphify-out — force-remove and lose it? (yes/no)

If the user selected the 🔒 current-session row, explain you can't remove it from within this session and skip just that one — everything else proceeds.

### 6. Remove the selected worktrees
Remove each selected worktree individually. Match the command to the row:
```bash
git worktree remove "<wt>"            # ✓ clean rows — no --force; git's refusal on a surprise-dirty tree is your safety net
git worktree remove --force "<wt>"    # ⚠ rows the user picked AND confirmed in step 5 — only these, one at a time
git worktree prune                    # after the removals, sweep any stale admin dirs from .git/worktrees/
```
`--force` is reserved for the specific flagged worktrees the user confirmed — **never** a blanket `--force` across the list. If a **✓ clean** worktree unexpectedly refuses to remove, **stop and look** — that surprise means its status wasn't what you thought; don't reach for `--force`.

### 7. Remove the superpowers folders
Two folders, each handled by its git status (see Repo specifics).

**`docs/superpowers/` — tracked → remove from disk AND untrack, then commit:**
```bash
git rm -r docs/superpowers        # NOT --cached: --cached would untrack but leave the files on disk
git commit -m "chore: remove docs/superpowers (specs + plans) for a clean slate"
```
This is **untrack + delete, not a history rewrite** — the specs/plans still exist in past commits (they're design docs, not secrets), which is fine and reversible. **Never** `git filter-repo`/`filter-branch` or force-push to purge history here. The commit lands on the main checkout's current branch — if that's a shared branch (`develop`/`main`) you'd rather not touch, create a branch first or leave the removal staged for the user.

**`.superpowers/` — gitignored scratch → just delete it:**
```bash
rm -rf .superpowers               # untracked plugin scratch (task briefs, reports, review diffs); regenerates
```
Git is not involved (0 tracked files), so there's no commit and no unsaved-work gate — it's disposable and rebuilds on the next superpowers run. Still name it in the plan you showed at step 4.

If a truly *untracked* (non-ignored) file turns up under `docs/superpowers/`, deleting it is permanent — list it and remove only after the user's OK.

### 8. Report — and verify `.git/worktrees/` is consistent
Confirm the admin metadata matches reality:
```bash
git worktree list --porcelain | awk '/^worktree /{print $2}'   # surviving worktrees
ls -1 .git/worktrees/                                          # one admin dir per surviving worktree — no strays
```
Then give the final matrix: worktrees removed, worktrees kept (+ why — user didn't pick / current session), the superpowers outcomes (`docs/superpowers/` removed + committed on which branch; `.superpowers/` scratch deleted), and a line confirming `.git/worktrees/` now holds only the surviving entries. If the user picked `none`, say so plainly — that's a correct result, not a failure.

## Never do this

- **A blanket `git worktree remove --force` across the list.** Force is per-worktree, only for flagged rows the user picked and confirmed (step 5). Bulk-forcing destroys unpushed, uncommitted work irreversibly.
- **Removing a worktree the user didn't select.** The user drives the list. Don't quietly add or drop rows.
- **Force-removing a ⚠ worktree without showing its warning first.** The warning + per-item confirm (steps 4–5) is exactly what the user asked for — never skip it to "save a step."
- **Removing the current session's own worktree** (`$CUR`). You'd orphan the session doing the cleanup. Skip it and say how to remove it later (another session).
- **`rm -rf` on `.git/worktrees/<name>/` admin dirs.** That corrupts git's bookkeeping. Clean them via `git worktree remove` + `git worktree prune` only.
- **`rm -rf docs/superpowers` while it's tracked.** Leaves phantom deletions — use `git rm -r`. `rm -rf` untracked content only after confirmation (it's permanent).
- **`git rm --cached` when the intent is a full removal.** `--cached` untracks but leaves the folder on disk — not gone. Use `git rm -r` (no `--cached`).
- **Rewriting history to purge `docs/superpowers/`** (`git filter-repo`/`filter-branch`, force-push). Out of scope: it changes every commit SHA, breaks open PRs and active worktrees. Untrack + delete going forward is enough.
- **`git rm` on `.superpowers/`.** It's untracked/gitignored, so `git rm` errors — delete it with `rm -rf`.
- **`git stash` to park dirty work.** The stash stack is shared across worktrees/sessions — you'd pollute the others.

| Rationalization | Reality |
|---|---|
| "It's locked/dirty, so I'll leave it off the list" | The user asked to pick in-use ones themselves. Show every worktree with its warning; let them choose. Don't pre-filter the menu. |
| "The user said gooi alles weg — `--force` all of them" | Force each flagged one individually after its warning + confirm. "All" still means the user saw what each deletion costs. |
| "It's dirty, so it's not removable" | If the only changes are under `graphify-out/`, it's effectively clean — that regenerates. Mark it ✓, don't flag it. |
| "I'll stash the dirty work to be safe" | The stash stack is shared — stashing surfaces junk in other sessions. Never stash; force-remove only if the user picked it, else leave it. |
| "I'll remove this session's own worktree too, they said everything" | Removing `$CUR` orphans the live session. Skip it; it can be removed later from another session. |
| "`.git/worktrees/` still has entries, I'll `rm` them" | Those are admin dirs for surviving worktrees, or stragglers. `git worktree prune` handles stragglers; hand-`rm` corrupts git. |
| "`--cached` keeps a copy on disk, that's safer" | You were asked to *remove* the folder — `--cached` leaves it sitting there. `git rm -r` removes from disk and git; history keeps the recoverable copy. |
| "Purge it from history so it's really gone" | These are design docs, not secrets. Rewriting history changes every SHA and breaks open PRs. Untrack + delete is enough. |

**Red flags — STOP:**
- About to type `git worktree remove --force` across multiple worktrees, or on a row you didn't warn about + confirm.
- About to leave a locked/dirty worktree **off the list** the user is supposed to pick from.
- About to remove the worktree this session is running in (`$CUR`).
- About to `rm -rf` a `.git/worktrees/` admin dir, or any git-tracked path.
- About to `git stash` in this (shared-stash) repo.
- About to `git rm --cached` a folder you were asked to delete (it stays on disk).
- About to `git filter-repo`/`filter-branch` or force-push to purge a folder from history.

## Quick reference

| Step | Command | Key detail |
|------|---------|------------|
| 1 | `CUR=$(git rev-parse --show-toplevel)` → `cd <main checkout>` | capture + protect the current session's worktree |
| 2 | `git worktree list --porcelain` | authoritative list + `locked` flag |
| 3 | `git -C <wt> status --porcelain` / `… log --branches --not --remotes` | ignore `graphify-out/`; reduce each to ✓ / ⚠ / 🔒 |
| 4 | *(numbered table)* | show every worktree + warning; user replies with numbers / range / `all` / `none` |
| 5 | *(per-item confirm)* | restate each ⚠ row's risk before force-removing it |
| 6 | `git worktree remove <wt>` (✓) · `--force <wt>` (confirmed ⚠) → `git worktree prune` | force only the specific flagged rows; never a blanket force |
| 7 | `git rm -r docs/superpowers` + commit · `rm -rf .superpowers` | tracked docs → `git rm` (no `--cached`) + commit; scratch → `rm -rf`; no history rewrite |
| 8 | `ls -1 .git/worktrees/` vs `git worktree list` | admin dirs match surviving worktrees; report the matrix |

## Common mistakes
- **Pre-filtering the list.** Dropping locked/dirty worktrees from the menu defeats the point — the user wants to pick in-use ones too. Show them all with warnings (step 4).
- **Blanket `--force`.** Force is per-row, only for flagged worktrees the user confirmed (steps 5–6). Bulk force destroys real work.
- **Treating `graphify-out/` dirt as real work.** It's rebuild noise — filter it before flagging (step 3), or every row looks unsafe.
- **Removing the current session's worktree.** `$CUR` is protected; you'd kill the session (step 1 / step 5).
- **Hand-deleting `.git/worktrees/` admin dirs.** Use `git worktree remove` + `prune`; `rm` corrupts git (step 6 / step 8).
- **`rm -rf docs/superpowers`** while tracked — use `git rm -r` (no `--cached`) so it's recoverable (step 7).
- **`git rm` on `.superpowers/`** — it's untracked/gitignored, so `git rm` errors; use `rm -rf` (step 7).
- **Rewriting history to purge the folder** — out of scope; untrack + delete going forward (Never do this).
- **Stashing to rescue work** — the stash stack is shared; never stash here (Never do this).
- **Removing before the user picks and confirms** — show the list, get the selection, confirm each ⚠ first (steps 4–5).
