// Exercises scripts/dev-cache-guard.mjs against throwaway fixture repos under
// the OS temp dir. No dependencies and no config: `pnpm test:scripts`, or
// `node scripts/dev-cache-guard.test.mjs`.
//
// The port cases matter most. Reclaiming a port means killing a process, so the
// suite pins both directions: a leftover server from this checkout is killed, a
// process belonging to anything else is left strictly alone. It also pins the
// symlink normalisation — macOS lsof reports /private/var/... where the path we
// compare against is /var/..., and without realpath() the guard silently
// misreads its own stray server as a stranger and never reclaims the port.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const GUARD =
  process.argv[2] ??
  resolve(dirname(fileURLToPath(import.meta.url)), 'dev-cache-guard.mjs');
const { discoverNextApps, refreshCache, reclaimPort, preflight } = await import(GUARD);

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};

const root = resolve(tmpdir(), `guard-fixture-${process.pid}`);
rmSync(root, { recursive: true, force: true });

/** Build a fixture repo: one Next app (alpha) + one non-Next app (api). */
function makeRepo({ port = null, nextVersion = '16.2.9' } = {}) {
  rmSync(root, { recursive: true, force: true });
  const alpha = resolve(root, 'apps/alpha');
  mkdirSync(alpha, { recursive: true });
  writeFileSync(resolve(alpha, 'next.config.ts'), 'export default {}\n');
  writeFileSync(resolve(alpha, 'package.json'), JSON.stringify({
    name: 'alpha',
    scripts: { dev: `node ../../scripts/dev-log.mjs alpha -- next dev${port ? ` -p ${port}` : ''}` },
  }));
  mkdirSync(resolve(alpha, 'node_modules/next'), { recursive: true });
  writeFileSync(resolve(alpha, 'node_modules/next/package.json'),
    JSON.stringify({ name: 'next', version: nextVersion }));

  const api = resolve(root, 'apps/api');
  mkdirSync(api, { recursive: true });
  writeFileSync(resolve(api, 'package.json'), JSON.stringify({ name: 'api', scripts: { dev: 'nest start' } }));
  return { alpha, api };
}

/** Put a recognisable file in .next so we can tell "kept" from "rebuilt". */
function seedCache(appDir) {
  mkdirSync(resolve(appDir, '.next/dev/server'), { recursive: true });
  writeFileSync(resolve(appDir, '.next/dev/server/marker'), 'original');
}
const markerAlive = (appDir) => existsSync(resolve(appDir, '.next/dev/server/marker'));
const stampFile = (appDir) => resolve(appDir, '.next/cache/.dev-stamp.json');

console.log('\n1. discovery');
{
  const { alpha } = makeRepo({ port: 3002 });
  const apps = discoverNextApps(root);
  ok('finds only the Next app', apps.length === 1 && apps[0].name === 'alpha', JSON.stringify(apps.map(a => a.name)));
  ok('reads port from the dev script', apps[0].port === 3002, `got ${apps[0].port}`);
  const noPort = (makeRepo({ port: null }), discoverNextApps(root));
  ok('tolerates a dev script without -p', noPort[0].port === null, `got ${noPort[0].port}`);
  void alpha;
}

console.log('\n2. unstamped cache (the tintsmith case)');
{
  const { alpha } = makeRepo({ port: 3002 });
  seedCache(alpha);
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('is cleared', reason === 'unstamped cache of unknown origin', `reason=${reason}`);
  ok('marker is gone', !markerAlive(alpha));
  ok('stamp is written', existsSync(stampFile(alpha)));
  ok('stamp records the app dir', JSON.parse(readFileSync(stampFile(alpha), 'utf8')).builtFor === alpha);
}

console.log('\n3. healthy cache is KEPT (this is the whole point)');
{
  const { alpha } = makeRepo({ port: 3002 });
  refreshCache(discoverNextApps(root)[0]);   // first run stamps it
  seedCache(alpha);                          // pretend a real build happened
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('second run keeps it', reason === null, `reason=${reason}`);
  ok('marker survives', markerAlive(alpha));
}

console.log('\n4. cache built for another directory');
{
  const { alpha } = makeRepo({ port: 3002 });
  refreshCache(discoverNextApps(root)[0]);
  seedCache(alpha);
  writeFileSync(stampFile(alpha), JSON.stringify({ builtFor: '/Users/someone/dev/tintsmith/apps/web', next: '16.2.9' }));
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('is cleared', /^built for /.test(reason ?? ''), `reason=${reason}`);
  ok('marker is gone', !markerAlive(alpha));
}

console.log('\n5. Next version bump');
{
  const { alpha } = makeRepo({ port: 3002, nextVersion: '16.2.9' });
  refreshCache(discoverNextApps(root)[0]);
  seedCache(alpha);
  writeFileSync(resolve(alpha, 'node_modules/next/package.json'), JSON.stringify({ version: '16.3.0' }));
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('is cleared', reason === 'next 16.2.9 -> 16.3.0', `reason=${reason}`);
  ok('new version stamped', JSON.parse(readFileSync(stampFile(alpha), 'utf8')).next === '16.3.0');
}

console.log('\n6. --clean forces a rebuild of a healthy cache');
{
  const { alpha } = makeRepo({ port: 3002 });
  refreshCache(discoverNextApps(root)[0]);
  seedCache(alpha);
  const reason = refreshCache(discoverNextApps(root)[0], { force: true });
  ok('is cleared', reason === '--clean', `reason=${reason}`);
  ok('marker is gone', !markerAlive(alpha));
}

console.log('\n7. survives a build that emptied .next but kept cache/');
{
  const { alpha } = makeRepo({ port: 3002 });
  refreshCache(discoverNextApps(root)[0]);
  rmSync(resolve(alpha, '.next/dev'), { recursive: true, force: true });  // build-style wipe
  seedCache(alpha);
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('stamp survived, cache kept', reason === null, `reason=${reason}`);
}

console.log('\n8. no .next at all (fresh worktree)');
{
  makeRepo({ port: 3002 });
  const reason = refreshCache(discoverNextApps(root)[0]);
  ok('nothing to clear', reason === null, `reason=${reason}`);
}

// --- port reclaim ------------------------------------------------------------
const spawned = [];
const listen = (port, cwd) => new Promise((res) => {
  const p = spawn(process.execPath,
    ['-e', `require('http').createServer().listen(${port},()=>console.log('up'))`],
    { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
  spawned.push(p);
  p.stdout.once('data', () => res(p));
});
// Never let a surviving fixture server hold the test process open.
const killAll = () => { for (const p of spawned) { try { p.kill('SIGKILL'); } catch {} } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\n9. port reclaim');
{
  const { alpha } = makeRepo({ port: 39017 });
  const app = discoverNextApps(root)[0];

  const ours = await listen(39017, alpha);           // cwd inside the repo
  const note = reclaimPort(app, root);
  await settle(600);
  ok('kills a stray server from this checkout', /reclaimed port 39017/.test(note ?? ''), `note=${note}`);
  ok('process is actually dead', !alive(ours.pid));

  const stranger = await listen(39017, tmpdir());    // cwd outside the repo
  const note2 = reclaimPort(app, root);
  await settle(600);
  ok('does NOT kill a foreign process', /left alone/.test(note2 ?? ''), `note=${note2}`);
  ok('foreign process still alive', alive(stranger.pid));
  stranger.kill('SIGKILL');

  ok('quiet when the port is free', (await settle(300), reclaimPort(app, root)) === null);
}

console.log('\n10. preflight() end to end');
{
  const { alpha } = makeRepo({ port: 3002 });
  seedCache(alpha);
  const first = preflight({ repoRoot: root, force: false });
  ok('reports the clear', first.length === 1 && /alpha: cleared \.next/.test(first[0]), JSON.stringify(first));
  const second = preflight({ repoRoot: root, force: false });
  ok('silent on a healthy repo', second.length === 0, JSON.stringify(second));
}

killAll();
rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
