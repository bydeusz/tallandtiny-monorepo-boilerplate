import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";

// MinIO requires password >= 8 chars
const MINIO_USER = "minioadmin";
const MINIO_PASS = "minioadmin";

let postgres;
let redis;
let minio;

export async function setup() {
  // Start all three containers in parallel
  [postgres, redis, minio] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine").start(),
    new GenericContainer("redis:7-alpine").withExposedPorts(6379).start(),
    new GenericContainer("minio/minio:RELEASE.2024-12-18T13-15-44Z")
      .withExposedPorts(9000)
      .withEnvironment({
        MINIO_ROOT_USER: MINIO_USER,
        MINIO_ROOT_PASSWORD: MINIO_PASS,
      })
      .withCommand(["server", "/data"])
      .withWaitStrategy(Wait.forHttp("/minio/health/live", 9000))
      .start(),
  ]);

  const url = postgres.getConnectionUri();
  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);
  const minioHost = minio.getHost();
  const minioPort = minio.getMappedPort(9000);

  // Set ALL required env vars so the spawned server process inherits them
  process.env.DATABASE_URL = url;
  process.env.REDIS_HOST = redisHost;
  process.env.REDIS_PORT = String(redisPort);
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.JWT_REFRESH_SECRET = randomBytes(32).toString("hex");
  process.env.S3_ENDPOINT = `http://${minioHost}:${minioPort}`;
  process.env.S3_ACCESS_KEY = MINIO_USER;
  process.env.S3_SECRET_KEY = MINIO_PASS;
  process.env.CORS_ORIGIN = "*";
  process.env.ALLOWED_EMAIL_DOMAINS = "example.com";
  process.env.NODE_ENV = "test";
  process.env.PORT = "3001";

  // Migrate and seed the throwaway database
  try {
    execSync("pnpm --filter @repo/database run db:deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
    execSync("pnpm --filter @repo/database run db:seed", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch (err) {
    await Promise.allSettled([
      postgres?.stop(),
      redis?.stop(),
      minio?.stop(),
    ]);
    postgres = undefined;
    redis = undefined;
    minio = undefined;
    throw err;
  }
}

export async function teardown() {
  await Promise.allSettled([
    postgres?.stop(),
    redis?.stop(),
    minio?.stop(),
  ]);
}
