---
name: clean-slate
description: "Use when the user wants to clean up their dev environment by tearing down the isolated git worktrees under .claude/worktrees/ and removing the docs/superpowers scratch folder (specs + plans) for a fresh start. Triggers on /project:clean-slate, \"ruim mijn worktrees op\", \"gooi alle worktrees weg\", \"clean slate\", \"opschonen\", \"reset mijn omgeving\", \"clean up my worktrees\"."
---

# /project:clean-slate

Tear down the isolated git worktrees under `.claude/worktrees/` and remove the `docs/superpowers/` scratch folder, to get back to a clean environment — **without ever destroying unsaved work or another running session's worktree.**

## Core principle

**"Clean everything" never means "force-delete everything."** A worktree can hold uncommitted work, unpushed commits, or a *live Claude session* — all of it invisible until you look. So this skill **inspects and classifies every worktree first, removes only the ones that are provably safe, and reports the rest instead of touching them.** It relies on git's own refusals as a second safety net (remove *without* `--force`), never uses `git stash` to "rescue" work (the stash stack is shared across worktrees), and treats the tracked `docs/superpowers/` deletion as a reviewable git change, not a throwaway `rm`. You see a plan and confirm before anything is removed.

## What this skill touches — and what it doesn't

- **Removes:** idle, provably-safe worktrees under `.claude/worktrees/`, and the `docs/superpowers/` folder.
- **Never removes:** the worktree this session is running in, worktrees that are locked / have a live session, or worktrees with unsaved or unpushed work. Those are **reported**, not deleted.
- It does **not** touch the main checkout, other branches, or any app code.

## Repo specifics you must know

- **`graphify-out/` is rebuild noise, not work.** A post-commit hook regenerates `graphify-out/` in every worktree, so nearly every worktree shows as "dirty" even when its real work is committed and pushed. A worktree whose **only** uncommitted changes are under `graphify-out/` (plus ignored files like `.DS_Store`) is **effectively clean** — do not skip it over rebuild noise. (This is the difference between a useful cleanup and one that skips everything.)
- **The git stash stack is shared** across all worktrees and other sessions. Never `git stash` to park dirty work — it surfaces in the other sessions. If a worktree's work must be preserved, that's the user's call (a commit on its own branch), not something this skill stashes away.
- **Active sessions show as `locked`.** `git worktree list --porcelain` marks worktrees with a live session as `locked`. Treat locked = active = do not remove.

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
- **docs/superpowers:** tracked → staged deletion; or untracked content found → needs your OK.

Wait for explicit go-ahead. This gate is the point — the user sees exactly what disappears.

### 5. Remove the safe worktrees — without `--force`
Remove each SAFE worktree individually, **never** with `--force`:
```bash
git worktree remove "<wt>"     # git refuses if it's unexpectedly dirty — that refusal is your safety net
git worktree prune             # clear stale admin entries after real removals
```
If `git worktree remove` refuses one you thought was safe, **stop and look** — do not reach for `--force`. Force-remove only a single worktree the user has explicitly named as disposable, one at a time, eyes open.

### 6. Remove docs/superpowers — as a reviewable change
Check tracked vs untracked first:
```bash
git status --porcelain --ignored docs/superpowers
```
- **Tracked files present** → stage the deletion so it's recoverable from history; leave it for the user to commit (don't auto-commit unless asked):
  ```bash
  git rm -r docs/superpowers
  ```
  Note: this removes the specs/plans **on this branch only** — the same files still exist on other branches.
- **Untracked content present** (not in git) → deleting it is permanent. List it and remove only after the user's OK. Ignored leftovers (`.DS_Store`) can be `rm`'d.

### 7. Report
Give the final matrix: worktrees removed, worktrees skipped (+ reason each), and the docs/superpowers outcome (staged deletion / removed / left alone). If everything was skipped (e.g. all worktrees are active or dirty), say so plainly and hand the list back — that's a correct result, not a failure.

## Never do this

- **`git worktree remove --force` in bulk.** It overrides git's dirty-check and destroys uncommitted, unpushed work irreversibly. Force one named worktree at a time, only on explicit request.
- **`rm -rf docs/superpowers` while it's tracked.** That leaves git reporting phantom deletions and doesn't clean the repo state — use `git rm`. `rm -rf` untracked content only after confirmation (it's permanent).
- **`git stash` to park dirty work.** The stash stack is shared across worktrees/sessions — you'd pollute the others. A commit on the worktree's own branch is the only safe rescue, and that's the user's call.
- **Removing a `locked`/active worktree or your own cwd's worktree.**

| Rationalization | Reality |
|---|---|
| "They said gooi alles weg, so `--force` all of them" | "Everything" never includes unsaved or another session's work. Skip the unsafe/active ones and report them. |
| "It's dirty, so skip it" | If the only changes are under `graphify-out/` (+ ignored files), it's effectively clean — that regenerates. Don't skip a removable worktree over rebuild noise. |
| "I'll stash the dirty work to be safe" | The stash stack is shared — stashing here surfaces junk in other sessions. Never stash; leave the worktree for the user. |
| "`rm -rf` the docs folder, it's faster" | Tracked → `rm` leaves phantom deletions; use `git rm`. Untracked → `rm` is permanent; confirm first. |

**Red flags — STOP:**
- About to type `git worktree remove --force` across multiple worktrees.
- About to `rm -rf` a git-tracked path.
- About to `git stash` in this (shared-stash) repo.
- About to remove a `locked` worktree, or the worktree you're running in.

## Quick reference

| Step | Command | Key detail |
|------|---------|------------|
| 1 | `cd <main checkout>` | never delete your own cwd's worktree |
| 2 | `git worktree list --porcelain` | authoritative list + `locked` flag |
| 3 | `git -C <wt> status --porcelain` / `git -C <wt> log --branches --not --remotes` | ignore `graphify-out/`; skip active/dirty/unpushed |
| 4 | *(show plan)* | remove / skip matrix → confirm |
| 5 | `git worktree remove <wt>` (no `--force`) → `git worktree prune` | git's refusal is the safety net |
| 6 | `git rm -r docs/superpowers` (tracked) | reversible; untracked → confirm first |

## Common mistakes
- **Force-removing worktrees.** Nine times out of ten a "dirty" worktree holds real unpushed work; `--force` destroys it. Remove without `--force` and let git refuse (step 5).
- **Skipping every worktree because they're all "dirty."** In this repo that dirt is `graphify-out/` rebuild noise — filter it out before judging (step 3), or the skill removes nothing.
- **Removing an active session's worktree.** `locked` = live session = skip (step 3).
- **`rm -rf docs/superpowers`.** It's tracked — use `git rm` so it's recoverable; report untracked content before deleting (step 6).
- **Stashing to rescue work.** The stash stack is shared across worktrees — never stash here (step 6 / Never do this).
- **Deleting before showing the plan.** Show the remove/skip matrix and get confirmation first (step 4).
