import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container;

export async function setup({ provide }) {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();

  // Worker processes are forked after globalSetup, inheriting this env var.
  process.env.DATABASE_URL = url;

  // Expose via Vitest's provide() so tests can also inject() it directly.
  provide("databaseUrl", url);

  // Apply migrations to the throwaway database. prisma.config.ts reads
  // DATABASE_URL from env, and dotenv does not override an already-set var.
  execSync("pnpm --filter @repo/database run db:deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

export async function teardown() {
  await container?.stop();
}
