// Runs `turbo run dev` (keeping its interactive TUI) and opens the dev URLs in
// the browser once each service is reachable. Invoked via the root `dev` script.
import { spawn } from 'node:child_process';

const TARGETS = [
  { name: 'web', url: 'http://localhost:3000' },
  { name: 'dashboard', url: 'http://localhost:3002' },
  { name: 'website', url: 'http://localhost:3003' },
  { name: 'swagger', url: 'http://localhost:3001/api/docs' },
  { name: 'prisma studio', url: 'http://localhost:5555' },
  { name: 'mailpit', url: 'http://localhost:8025' },
];

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

/** Open a URL in the default browser, cross-platform, without blocking. */
function openUrl(url) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}

/** Poll a URL until it responds (server is up) or the timeout elapses. */
async function waitForUrl(url, signal) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline && !signal.aborted) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      // Any non-5xx response means the server is up and routing.
      if (res.status < 500) return true;
    } catch {
      // Not listening yet — keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

const controller = new AbortController();

// Start each opener in the background; they print nothing so the TUI stays clean.
for (const { url } of TARGETS) {
  waitForUrl(url, controller.signal).then((ready) => {
    if (ready && !controller.signal.aborted) openUrl(url);
  });
}

// Let turbo own the terminal (and Ctrl+C) so its TUI renders normally.
const turbo = spawn('turbo run dev', { stdio: 'inherit', shell: true });

// Defer shutdown to turbo: ignore signals here and exit when turbo exits.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => {});
turbo.on('exit', (code) => {
  controller.abort();
  process.exit(code ?? 0);
});
