---
name: clean-slate
description: "Use when the user wants to clean up their dev environment by tearing down the isolated git worktrees under .claude/worktrees/ and removing the superpowers folders — the tracked docs/superpowers/ (specs + plans) and the gitignored .superpowers/ scratch — for a fresh start. Triggers on /project:clean-slate, \"ruim mijn worktrees op\", \"gooi alle worktrees weg\", \"clean slate\", \"opschonen\", \"reset mijn omgeving\", \"verwijder superpowers\", \"clean up my worktrees\"."
---

# /project:clean-slate

Tear down the isolated git worktrees under `.claude/worktrees/` and remove the two superpowers folders — the tracked `docs/superpowers/` (specs + plans) and the gitignored `.superpowers/` scratch — to get back to a clean environment, **without ever destroying unsaved work or another running session's worktree.**

## Core principle

**"Clean everything" never means "force-delete everything."** A worktree can hold uncommitted work, unpushed commits, or a *live Claude session* — all of it invisible until you look. So this skill **inspects and classifies every worktree first, removes only the ones that are provably safe, and reports the rest instead of touching them.** It relies on git's own refusals as a second safety net (remove *without* `--force`), never uses `git stash` to "rescue" work (the stash stack is shared across worktrees), and handles the two superpowers folders by their git status — the **tracked** `docs/superpowers/` fully removed with `git rm` (gone from disk *and* untracked), the **untracked** `.superpowers/` scratch removed with `rm -rf`. You see a plan and confirm before anything is removed.

## What this skill touches — and what it doesn't

- **Removes:** idle, provably-safe worktrees under `.claude/worktrees/`, the tracked `docs/superpowers/` folder (via `git rm`), and the gitignored `.superpowers/` scratch folder (via `rm -rf`).
- **Never removes:** the worktree this session is running in, worktrees that are locked / have a live session, or worktrees with unsaved or unpushed work. Those are **reported**, not deleted.
- It does **not** touch the main checkout, other branches, or any app code.

## Repo specifics you must know

- **`graphify-out/` is rebuild noise, not work.** A post-commit hook regenerates `graphify-out/` in every worktree, so nearly every worktree shows as "dirty" even when its real work is committed and pushed. A worktree whose **only** uncommitted changes are under `graphify-out/` (plus ignored files like `.DS_Store`) is **effectively clean** — do not skip it over rebuild noise. (This is the difference between a useful cleanup and one that skips everything.)
- **The git stash stack is shared** across all worktrees and other sessions. Never `git stash` to park dirty work — it surfaces in the other sessions. If a worktree's work must be preserved, that's the user's call (a commit on its own branch), not something this skill stashes away.
- **Active sessions show as `locked`.** `git worktree list --porcelain` marks worktrees with a live session as `locked`. Treat locked = active = do not remove.
- **Two different superpowers folders — different handling.** `docs/superpowers/` holds the design **specs + plans** and is **git-tracked** (its files were committed before the path was gitignored) → remove with `git rm -r` so it's gone from disk *and* from future commits. `.superpowers/` is the plugin's local **scratch/log** (task briefs, subagent reports, review diffs), is **gitignored and untracked**, and regenerates on the next superpowers run → just `rm -rf` it; git is not involved. Don't cross the wires: `git rm` on the untracked scratch errors, and `rm -rf` on the tracked docs leaves phantom deletions.

## Workflow

Do these in order. **Nothing is removed until you show the plan and the user confirms (step 4).**

### 1. Leave any worktree — operate from the main checkout
You cannot remove the worktree you are standing in. Note your current worktree path first (`git rev-parse --show-toplevel`), then move to the main working tree:
```bash
cd "$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"   # first entry = main checkout
```
Remember the current-session worktree path — it is always **skipped** (step 3).

### 2. Inventory the worktrees
```bash
git worktree list --porcelain
```
This is the authoritative list, with each worktree's `branch` and whether it is `locked`.

### 3. Classify every worktree — remove only the provably safe
For **each** worktree under `.claude/worktrees/`, decide with these observable predicates:

| Condition (observable) | Verdict |
|---|---|
| It is the **current session's** worktree (step 1) | **SKIP** — can't delete your own workspace |
| `git worktree list --porcelain` shows it **`locked`** (live session) | **SKIP + warn** — active session |
| `git -C <wt> status --porcelain` has entries **outside** `graphify-out/` and ignored files | **SKIP + report** — real uncommitted work |
| `git -C <wt> log --branches --not --remotes --oneline` (its branch) is **non-empty** *and* the branch is **not merged** into `origin/develop` | **SKIP + report** — unpushed, unmerged commits |
| none of the above — clean (or only `graphify-out/`/ignored dirt) **and** pushed or merged | **SAFE → remove** |

Inspect per worktree:
```bash
git worktree list --porcelain | awk '/^worktree /{print $2}' | grep '/\.claude/worktrees/' | while read -r wt; do
  echo "== $wt =="
  git -C "$wt" status --porcelain | grep -v '^.. graphify-out/' || echo "  (clean apart from graphify-out)"
  git -C "$wt" log --branches --not --remotes --oneline    # unpushed commits, if any
done
```
Read the output yourself — don't pipe it straight into a delete. A blank status line (after dropping `graphify-out/`) and no unpushed/unmerged commits means SAFE.

### 4. Show the plan and get confirmation
Present a short matrix before removing anything:
- **Will remove:** `<paths>` (clean + pushed/merged).
- **Will skip:** `<paths>` each with its reason (current · locked/active · uncommitted work · unpushed commits).
- **`docs/superpowers/`** (tracked) → removed from disk + git (`git rm -r`), committed on the main checkout's current branch (name it — if it's a shared branch like `develop`, offer to branch first or leave it staged).
- **`.superpowers/`** (gitignored scratch) → deleted from disk (`rm -rf`); regenerates on the next superpowers run.

Wait for explicit go-ahead. This gate is the point — the user sees exactly what disappears.

### 5. Remove the safe worktrees — without `--force`
Remove each SAFE worktree individually, **never** with `--force`:
```bash
git worktree remove "<wt>"     # git refuses if it's unexpectedly dirty — that refusal is your safety net
git worktree prune             # clear stale admin entries after real removals
```
If `git worktree remove` refuses one you thought was safe, **stop and look** — do not reach for `--force`. Force-remove only a single worktree the user has explicitly named as disposable, one at a time, eyes open.

### 6. Remove the superpowers folders
Two folders, each handled by its git status (see Repo specifics).

**`docs/superpowers/` — tracked → remove from disk AND untrack, then commit:**
```bash
git rm -r docs/superpowers        # NOT --cached: --cached would untrack but leave the files on disk
git commit -m "chore: remove docs/superpowers (specs + plans) for a clean slate"
```
`git rm -r` deletes the working files and stages the removal; the commit takes it out of git going forward, and it stays gitignored so it won't come back. This is **untrack + delete, not a history rewrite** — the specs/plans still exist in past commits (they're design docs, not secrets), which is fine and reversible. **Never** `git filter-repo`/`filter-branch` or force-push to purge history as part of this skill. The commit lands on the main checkout's current branch — if that's a shared branch (`develop`/`main`) you'd rather not touch, create a branch first or leave the removal staged for the user.

**`.superpowers/` — gitignored scratch → just delete it:**
```bash
rm -rf .superpowers               # untracked plugin scratch (task briefs, reports, review diffs); regenerates
```
Git is not involved (0 tracked files), so there is no commit and no unsaved-work gate — it's disposable and rebuilds on the next superpowers run. It's still part of the plan you showed at step 4.

If a truly *untracked* (non-ignored) file turns up under `docs/superpowers/`, deleting it is permanent — list it and remove only after the user's OK.

### 7. Report
Give the final matrix: worktrees removed, worktrees skipped (+ reason each), and the folder outcomes — `docs/superpowers/` (removed + committed, on which branch) and `.superpowers/` (scratch deleted). If everything was skipped (e.g. all worktrees are active or dirty), say so plainly and hand the list back — that's a correct result, not a failure.

## Never do this

- **`git worktree remove --force` in bulk.** It overrides git's dirty-check and destroys uncommitted, unpushed work irreversibly. Force one named worktree at a time, only on explicit request.
- **`rm -rf docs/superpowers` while it's tracked.** That leaves git reporting phantom deletions and doesn't clean the repo state — use `git rm`. `rm -rf` untracked content only after confirmation (it's permanent).
- **`git rm --cached` when the intent is a full removal.** `--cached` untracks but leaves the folder on disk, so it's not actually gone. Use `git rm -r` (no `--cached`) to remove from disk *and* git.
- **Rewriting history to purge `docs/superpowers/`** (`git filter-repo`/`filter-branch`, force-push). Out of scope: it changes every commit SHA, breaks open PRs and the active worktrees, and needs a force-push. Untrack + delete going forward is enough.
- **`git rm` on `.superpowers/`.** It's untracked/gitignored, so `git rm` errors — `.superpowers/` is disposable scratch, delete it with `rm -rf`.
- **`git stash` to park dirty work.** The stash stack is shared across worktrees/sessions — you'd pollute the others. A commit on the worktree's own branch is the only safe rescue, and that's the user's call.
- **Removing a `locked`/active worktree or your own cwd's worktree.**

| Rationalization | Reality |
|---|---|
| "They said gooi alles weg, so `--force` all of them" | "Everything" never includes unsaved or another session's work. Skip the unsafe/active ones and report them. |
| "It's dirty, so skip it" | If the only changes are under `graphify-out/` (+ ignored files), it's effectively clean — that regenerates. Don't skip a removable worktree over rebuild noise. |
| "I'll stash the dirty work to be safe" | The stash stack is shared — stashing here surfaces junk in other sessions. Never stash; leave the worktree for the user. |
| "`rm -rf` the docs folder, it's faster" | Tracked → `rm` leaves phantom deletions; use `git rm`. Untracked → `rm` is permanent; confirm first. |
| "`--cached` keeps a copy on disk, that's safer" | You were asked to *remove* it — `--cached` untracks but leaves the folder sitting there, so it's not gone. `git rm -r` removes from disk and git; git history keeps the recoverable copy. |
| "Purge it from history so it's really gone" | These are design docs, not secrets. Rewriting history changes every SHA, breaks open PRs and active worktrees, and needs a force-push. Untrack + delete is enough; don't rewrite history in a routine cleanup. |

**Red flags — STOP:**
- About to type `git worktree remove --force` across multiple worktrees.
- About to `rm -rf` a git-tracked path.
- About to `git stash` in this (shared-stash) repo.
- About to remove a `locked` worktree, or the worktree you're running in.
- About to `git rm --cached` a folder you were asked to delete (it stays on disk).
- About to `git filter-repo`/`filter-branch` or force-push to purge a folder from history.

## Quick reference

| Step | Command | Key detail |
|------|---------|------------|
| 1 | `cd <main checkout>` | never delete your own cwd's worktree |
| 2 | `git worktree list --porcelain` | authoritative list + `locked` flag |
| 3 | `git -C <wt> status --porcelain` / `git -C <wt> log --branches --not --remotes` | ignore `graphify-out/`; skip active/dirty/unpushed |
| 4 | *(show plan)* | remove / skip matrix → confirm |
| 5 | `git worktree remove <wt>` (no `--force`) → `git worktree prune` | git's refusal is the safety net |
| 6 | `git rm -r docs/superpowers` + commit · `rm -rf .superpowers` | tracked docs → `git rm` (no `--cached`) + commit; scratch → `rm -rf`; no history rewrite |

## Common mistakes
- **Force-removing worktrees.** Nine times out of ten a "dirty" worktree holds real unpushed work; `--force` destroys it. Remove without `--force` and let git refuse (step 5).
- **Skipping every worktree because they're all "dirty."** In this repo that dirt is `graphify-out/` rebuild noise — filter it out before judging (step 3), or the skill removes nothing.
- **Removing an active session's worktree.** `locked` = live session = skip (step 3).
- **`rm -rf docs/superpowers`.** It's tracked — use `git rm -r` (no `--cached`) so it's recoverable; report truly untracked content before deleting (step 6).
- **`git rm --cached docs/superpowers`.** That untracks but leaves the folder on disk — you asked for it gone. Use `git rm -r` (no `--cached`) + commit (step 6).
- **`git rm` on `.superpowers/`.** It's untracked/gitignored, so `git rm` errors — use `rm -rf` (step 6).
- **Rewriting history to purge the folder.** Out of scope — untrack + delete going forward; never `git filter-repo`/force-push in this skill (Never do this).
- **Stashing to rescue work.** The stash stack is shared across worktrees — never stash here (step 6 / Never do this).
- **Deleting before showing the plan.** Show the remove/skip matrix and get confirmation first (step 4).
