// Wrapper around a single dev command. It mirrors the command's output to its
// own stdout/stderr (so Turbo's TUI keeps rendering it normally) AND tees a
// clean, ANSI-stripped copy to `tmp/<name>-dev.log` at the repo root. The log
// is truncated on every start, so it always holds the latest run only.
//
// Usage (from a package's `dev` script):
//   node ../../scripts/dev-log.mjs <name> -- <command> [args...]
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const name = argv[0];
const command = sep === -1 ? [] : argv.slice(sep + 1);

if (!name || sep !== 1 || command.length === 0) {
  console.error('usage: dev-log.mjs <name> -- <command> [args...]');
  process.exit(1);
}

// Repo root is the parent of this script's directory (scripts/).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logDir = resolve(repoRoot, 'tmp');
mkdirSync(logDir, { recursive: true });

// 'w' truncates: the log is recreated on every dev start.
const logFile = resolve(logDir, `${name}-dev.log`);
const out = createWriteStream(logFile, { flags: 'w' });
out.write(`=== ${name} dev log - started ${new Date().toISOString()} ===\n`);

// Strip ANSI escape sequences so the on-disk log stays grep-friendly. Built
// from char codes to keep this source free of literal control characters.
const ESC = String.fromCharCode(27); // \x1b
const BEL = String.fromCharCode(7); // \x07
const CSI = new RegExp(ESC + '\\[[0-9;?]*[ -/]*[@-~]', 'g'); // colours, cursor
const OSC = new RegExp(ESC + '\\][^' + BEL + ']*' + BEL, 'g'); // terminal title
const stripAnsi = (text) => text.replace(CSI, '').replace(OSC, '');

const [cmd, ...args] = command;
const child = spawn(cmd, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  shell: process.platform === 'win32',
});

/** Mirror a chunk to the live stream and append a clean copy to the log. */
function tee(chunk, live) {
  live.write(chunk);
  out.write(stripAnsi(chunk.toString()));
}
child.stdout.on('data', (chunk) => tee(chunk, process.stdout));
child.stderr.on('data', (chunk) => tee(chunk, process.stderr));

// Forward termination signals so Turbo's Ctrl+C cleanly stops the child.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', (err) => {
  const message = `[dev-log] failed to start "${cmd}": ${err.message}\n`;
  process.stderr.write(message);
  out.write(message);
  out.end(() => process.exit(1));
});

child.on('exit', (code, signal) => {
  out.end(() => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
});
