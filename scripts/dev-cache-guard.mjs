// Pre-flight guards that `pnpm dev` runs before handing over to turbo.
//
// They exist for one failure mode: Turbopack serving a *cached* module
// resolution failure. The app throws `Cannot find module 'next-intl'` while the
// dependency is installed and its symlink resolves fine, because Turbopack
// baked a `throw new Error("Cannot find module ...")` stub into a chunk on disk
// and keeps serving that chunk. Reinstalling deps or editing next.config changes
// nothing, because the failure is build output, not a live resolution.
//
// Two things poison a cache that way:
//
//   1. A `.next` that belongs somewhere else. Turbopack bakes absolute paths
//      into its chunk module ids, so a cache is only valid for the exact
//      directory it was built in. One inherited from another project, copied
//      into a worktree, or left behind by a different Next version resolves
//      imports against the wrong root. We stamp each cache with the app path and
//      Next version it was built for, and clear it only when that stamp no
//      longer matches — a healthy cache is never thrown away, because rebuilding
//      one is not free (a cold route costs seconds, a warm one milliseconds).
//   2. Two dev servers on one port. A leftover `next dev` from an earlier
//      session keeps its port and its `.next`; a second server writing the same
//      directory interleaves output and corrupts it. We reclaim such ports.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

// Kept under .next/cache/ because `next build` empties .next but preserves the
// cache directory, so a build doesn't cost a needless cold start afterwards.
const STAMP_PATH = ['.next', 'cache', '.dev-stamp.json'];

/** Every app under apps/ that runs Next, with the port its dev script binds. */
export function discoverNextApps(repoRoot) {
  const appsDir = resolve(repoRoot, 'apps');
  if (!existsSync(appsDir)) return [];
  const apps = [];
  for (const name of readdirSync(appsDir).sort()) {
    const dir = resolve(appsDir, name);
    const isNext = ['ts', 'js', 'mjs'].some((ext) =>
      existsSync(resolve(dir, `next.config.${ext}`)),
    );
    if (!isNext) continue;
    let port = null;
    try {
      const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
      // Ports live in the dev script (`next dev -p 3002`) — read them from there
      // rather than duplicating the list and letting the two drift apart.
      const match = /-p\s+(\d+)/.exec(pkg.scripts?.dev ?? '');
      if (match) port = Number(match[1]);
    } catch {
      // No readable package.json: the cache is still worth guarding.
    }
    apps.push({ name, dir, port });
  }
  return apps;
}

/** The identity a valid `.next` for this app must carry. */
function expectedStamp(app) {
  let next = 'unknown';
  try {
    next = JSON.parse(
      readFileSync(resolve(app.dir, 'node_modules/next/package.json'), 'utf8'),
    ).version;
  } catch {
    // Not installed yet — the stamp still pins the path, which is the part that
    // actually poisons resolution.
  }
  return { builtFor: app.dir, next };
}

/**
 * Drop the app's `.next` when its stamp doesn't match this checkout, then
 * (re)write the stamp. Returns why it was cleared, or null if it was kept.
 */
export function refreshCache(app, { force = false } = {}) {
  const nextDir = resolve(app.dir, '.next');
  const stampFile = resolve(app.dir, ...STAMP_PATH);
  const want = expectedStamp(app);
  let reason = null;

  if (existsSync(nextDir)) {
    if (force) {
      reason = '--clean';
    } else {
      let have = null;
      try {
        have = JSON.parse(readFileSync(stampFile, 'utf8'));
      } catch {
        // Missing or unreadable stamp: the cache predates this guard, so its
        // origin is unknown and it is exactly the kind we cannot trust.
      }
      if (!have) reason = 'unstamped cache of unknown origin';
      else if (have.builtFor !== want.builtFor)
        reason = `built for ${have.builtFor}`;
      else if (have.next !== want.next)
        reason = `next ${have.next} -> ${want.next}`;
    }
    if (reason) rmSync(nextDir, { recursive: true, force: true });
  }

  mkdirSync(dirname(stampFile), { recursive: true });
  writeFileSync(stampFile, `${JSON.stringify(want, null, 2)}\n`);
  return reason;
}

/** PIDs listening on a TCP port. */
function listenersOn(port) {
  const { stdout } = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });
  return (stdout ?? '')
    .split('\n')
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
}

/** Working directory of a PID, or null if it can't be determined. */
function cwdOf(pid) {
  const { stdout } = spawnSync(
    'lsof',
    ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'],
    { encoding: 'utf8' },
  );
  const line = (stdout ?? '').split('\n').find((l) => l.startsWith('n'));
  return line ? line.slice(1) : null;
}

/**
 * Resolve symlinks so two spellings of one directory compare equal. lsof always
 * reports the real path (/private/var/...), while the path we start from may go
 * through a symlink (/var/..., or a symlinked home or worktree). Without this
 * the guard mistakes its own leftover server for a stranger and leaves it alone.
 */
function realPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Reclaim a dev port from a leftover server. Only kills processes running from
 * inside this checkout — a stranger on the port (another project, another
 * worktree) is reported instead, never killed.
 */
export function reclaimPort(app, repoRoot) {
  if (app.port == null || process.platform === 'win32') return null;
  const root = realPath(repoRoot);
  for (const pid of listenersOn(app.port)) {
    const reported = cwdOf(pid);
    const cwd = reported ? realPath(reported) : null;
    if (cwd && (cwd === root || cwd.startsWith(`${root}/`))) {
      try {
        process.kill(pid, 'SIGTERM');
        return `${app.name}: reclaimed port ${app.port} from stray pid ${pid}`;
      } catch {
        // Already gone between listing and killing — nothing to reclaim.
      }
    } else {
      return `${app.name}: port ${app.port} held by pid ${pid} outside this checkout (${cwd ?? 'unknown cwd'}) — left alone`;
    }
  }
  return null;
}

/** Run every guard for the repo. Returns human-readable notes about what it did. */
export function preflight({ repoRoot, force = false }) {
  const notes = [];
  for (const app of discoverNextApps(repoRoot)) {
    const cleared = refreshCache(app, { force });
    if (cleared) notes.push(`${app.name}: cleared .next (${cleared})`);
    const reclaimed = reclaimPort(app, repoRoot);
    if (reclaimed) notes.push(reclaimed);
  }
  return notes;
}
