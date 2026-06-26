# Port `nestjs-boilerplate` → `apps/api` — Design

**Date:** 2026-06-24
**Status:** Approved
**Author:** Tadeusz de Ruijter (with Claude)

## 1. Purpose

Fold the full standalone `nestjs-boilerplate` (`~/dev/boilerplate/nestjs-boilerplate`)
into the tallandtiny Turborepo/pnpm monorepo as `apps/api`, **faithfully**: all
endpoints, all security measures, all mailers, plus the BullMQ queues and the
separate worker process. The result must be wired into the monorepo the way the
monorepo already works:

- Prisma models live in `@repo/database` (one source of truth, used by the API
  and — in future — by every app).
- The API is consumable through the **existing orval pipeline**: NestJS
  endpoints (Swagger-decorated) → OpenAPI at `/api/docs-json` → orval generates
  `@repo/queries` (React Query hooks + axios) → the Next.js frontends
  (`web`:3000, `dashboard`:3002, `website`:3003) consume that.

This is the sequel to the Docker design
(`2026-06-23-docker-dev-prod-containerization-design.md`), which was explicitly
"step 1" and deferred the worker + redis-in-prod as *documented, not built*.
This spec builds them.

**Scope of this slice:** backend + infra, made consumable. Full frontend auth
UX (login screens, token storage/refresh) is the **next** slice; here the
frontends are only made *able* to consume the API (CORS, regenerated client,
a mutator that is ready for a bearer token).

## 2. Locked decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Where the Prisma models live | **`@repo/database`** | One source of truth for the monorepo; all apps share one client. The `Mini` model is removed. |
| 2 | The `minis` sample module + `Mini` model | **Remove** | The real boilerplate modules replace the reference slice. Its `@repo/queries` output is dropped. |
| 3 | API conventions | **Full boilerplate-faithful** | URI versioning (`/api/v1`), response envelope (`{success,data,meta}`), and every global guard/filter/interceptor/pino are ported 1:1. "All security measures intact." |
| 4 | Frontend/infra reach of this slice | **Backend + infra, consumable** | Full backend + worker/queues/async-mail + Docker activation; CORS + orval regen + bearer-ready mutator. Frontend auth UX = next slice. |
| a | Migration history in `@repo/database` | **Reset to one clean `init`** | Dev-only DB, nothing in prod. Cleaner than stacking a drop-`Mini` + add-all migration. |
| b | Swagger path | **Keep `/api/docs`** | Leaves orval's `…/api/docs-json` input untouched; gated to non-production (as in the boilerplate). |
| c | Spec granularity | **One spec, phased plan** | The app is cohesive and its modules are interdependent (auth↔users, files↔org-access); a single design with a phased implementation plan fits best. |

## 3. Current state (verified)

### tallandtiny (`apps/api` today)
- NestJS 11, port **3001**, global prefix `api`, Swagger at `/api/docs`
  (orval reads `/api/docs-json`). Builds with `nest build` → `apps/api/dist/main.js`.
- Modules: minimal `health` (`GET /api/health`), sample `minis`, thin `prisma`
  wrapper (`PrismaService.db = prisma` singleton from `@repo/database`).
- `main.ts`: global prefix `api`, CORS for `:3000/:3002/:3003`, `ValidationPipe`
  (`whitelist`, `transform`), Swagger, shutdown hooks. **No** versioning,
  envelope, helmet, throttling, auth, pino.
- `tsconfig` extends `@repo/typescript-config/nestjs.json`; package is CJS
  (no `"type":"module"`).

### `@repo/database`
- Prisma 7, ESM (`"type":"module"`), generator `prisma-client` → ESM client in
  `packages/database/src/generated/prisma`, `@prisma/adapter-pg` + `pg`.
- `client.ts` builds a `PrismaPg` adapter from `DATABASE_URL` and exports a
  `prisma` singleton; `index.ts` re-exports the singleton **and** the whole
  generated client (`PrismaClient`, `Prisma`, model types, enums).
- One migration (`…_init`) for the `Mini` model. `prisma.config.ts` (Prisma 7)
  drives `migrate dev/deploy`.
- Consumed by the current CJS `apps/api` via Node ≥22.12 `require(esm)` interop
  (engines: `node >=22.12`). This interop path is kept.

### `@repo/queries`
- orval (`tags-split`, `react-query` + `axios`, `clean:true`) generates from
  `http://localhost:3001/api/docs-json`. Custom mutator (`custom-axios.ts`)
  baseURL = `NEXT_PUBLIC_API_URL`, returns the axios body (`.then(({data}) => data)`),
  **no auth header**. `src/index.ts` re-exports the `minis` endpoints + model.

### The boilerplate (source of the port)
- NestJS 11, Express, Prisma 7 (`@prisma/adapter-pg`), BullMQ on Redis,
  S3/MinIO storage, nodemailer + Handlebars mail, pino logging.
- **Two entrypoints**: `main.ts` (HTTP → `AppModule`) and `main-worker.ts`
  (headless `createApplicationContext` → `WorkerModule`).
- `PrismaService extends PrismaClient` with `super({ adapter })` (constructs its
  own `PrismaPg` from `database.url`). **This compiles** — the tallandtiny
  "extends fails" note only applied to a *bare* `super()`.
- ~55 `this.prisma.<model>.…` calls (port verbatim once `PrismaService`
  subclasses the client) and ~11 `…/generated/prisma/client` type imports
  (`Prisma`, `User`, `OrganisationRole`, `FileScope`) that must be re-pointed.

## 4. Target architecture (`apps/api/src`)

```
config/        configuration.ts (config namespaces) + env.validation.ts (class-validator)
common/
  decorators/  public, current-user, skip-transform, api-paginated-response
  dto/         base-entity, paginated-response, pagination-query
  filters/     all-exceptions.filter (HttpException + Prisma error mapping → ApiErrorResponse)
  guards/      jwt-auth.guard (global APP_GUARD; honours @Public)
  interceptors/transform (envelope), request-logging, user-scoped-cache (per-user cache key)
  interfaces/  api-response, paginated-result
  logger/      logger.module (nestjs-pino)
  middleware/  request-id.middleware
  services/    graceful-shutdown.service
  utils/       hash (bcrypt), email (domain allow-list), pagination
modules/
  redis/        @Global ioredis RedisService
  storage/      @Global S3 (AWS SDK v3 → MinIO) StorageService
  queue/        BullMQ QueueModule.register('producer'|'worker'|'both'), mail queue + MailProcessor
  mail/         nodemailer + Handlebars MailService, 8 .hbs templates, /mail/contact
  auth/         JWT access + opaque rotating refresh, 12 routes
  users/        4 routes, user-scoped cache
  organisations/9 routes + OrganisationAccessService (exported, central authz)
  files/        5 routes, magic-byte MIME validation, 5 MB cap
  health/       terminus: memory + DB + redis
prisma/         prisma.service.ts (extends PrismaClient from @repo/database)
main.ts         HTTP bootstrap
main-worker.ts  headless worker context
app.module.ts   API graph (global Config/Cache/Throttler/Bull + global guards/filters/interceptors)
worker.module.ts Config + Bull + Logger + Prisma + Redis + Mail + QueueModule.register('worker')
```

Builds to `apps/api/dist/main.js` **and** `apps/api/dist/main-worker.js`
(both emitted by one `nest build` since both are under `src`).

## 5. Deliverables (phased)

### Phase 0 — Database + Prisma access
- **`@repo/database` schema merge:** add `User`, `Organisation`,
  `OrganisationMember`, `RefreshToken`, `ActivationCode`, `EmailChangeRequest`,
  `File` + enums `FileScope`, `OrganisationRole` to
  `packages/database/prisma/schema.prisma`. Remove `Mini`. Keep the existing
  `prisma-client` ESM generator + `@prisma/adapter-pg`.
- **Migration reset:** delete the `Mini` `init` migration, create one fresh
  `init` from the merged schema. `db:generate` regenerates the client.
- **Seed:** port `prisma/seed.ts` + `seeders/{user,organisation}.seeder.ts` into
  `packages/database/prisma/`; add a `db:seed` script (dev convenience).
- **`apps/api` PrismaService:** replace the `.db`-wrapper with the boilerplate's
  subclass `PrismaService` (`extends PrismaClient`, builds `PrismaPg` from
  `database.url`), importing the client from `@repo/database`. `PrismaModule`
  stays `@Global`. Add `@prisma/adapter-pg` + `pg` to `apps/api` deps.

### Phase 1 — Bootstrap, common, config
- **Deps:** add to `apps/api/package.json`: `@nestjs/jwt`, `@nestjs/config`,
  `@nestjs/throttler`, `@nestjs/terminus`, `@nestjs/bullmq`,
  `@nestjs/cache-manager`, `bullmq`, `cache-manager`, `@keyv/redis`, `ioredis`,
  `nestjs-pino`, `pino-http`, `pino-roll`, `pino-pretty`, `nodemailer`,
  `handlebars`, `bcrypt`, `helmet`, `ms`, `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`, `@prisma/adapter-pg`, `pg`; dev types
  `@types/bcrypt`, `@types/nodemailer`, `@types/multer`, `@types/pg`,
  `@types/ms`.
- **`config/`:** port `configuration.ts` (namespaces: `port`, `nodeEnv`,
  `apiPrefix`, `database.url`, `redis.{host,port}`, `cache.ttl`,
  `cors.{origins,methods,maxAge}`, `log.{level,fileEnabled}`,
  `shutdown.forceExitTimeoutMs`, `jwt.{secret,expiration,refreshSecret,refreshExpiration}`,
  `throttle.{ttl,limit}`, `auth.{allowedEmailDomains,registrationEnabled,frontendUrl}`,
  `mail.*`, `storage.*`) and `env.validation.ts`. Adjust defaults to tallandtiny:
  `PORT=3001`, `apiPrefix='api'`, default CORS origins `:3000,:3002,:3003`.
- **`common/`:** port the whole tree. Re-point `all-exceptions.filter.ts`'s
  `Prisma` import to `@repo/database`. Keep `UserScopedCacheInterceptor`
  (per-user cache key — an auth-isolation control, do not drop).
- **`main.ts`:** helmet (CSP off in dev), CORS from config, `requestIdMiddleware`,
  `VersioningType.URI` (`defaultVersion '1'`), global prefix `api`, global
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`),
  `nestjs-pino` logger (`bufferLogs:true`), Swagger at `/api/docs`
  (non-production only, `addBearerAuth`), shutdown hooks, the startup banner
  (updated to `/api/v1` + `/api/docs`), port 3001.
- **`app.module.ts`:** global `ConfigModule` (validate + load), `BullModule`
  (Redis), `CacheModule` (Keyv/Redis), `ThrottlerModule`; providers
  `APP_GUARD: ThrottlerGuard` then `JwtAuthGuard` (order preserved),
  `APP_FILTER: AllExceptionsFilter`, `APP_INTERCEPTOR: RequestLoggingInterceptor`
  then `TransformInterceptor`, `GracefulShutdownService`.

### Phase 2 — Infra modules + worker
- Port `redis` (`@Global`), `storage` (`@Global`), `queue`
  (`QueueModule.register(mode)`, `mail` queue + `MailProcessor`), `mail`
  (`MailService` + 8 templates), re-pointing Prisma type imports to
  `@repo/database`.
- **`nest-cli.json`:** add an asset rule copying `modules/mail/templates/**/*.hbs`
  into `dist` (so `MailService` finds `__dirname/templates` at runtime and the
  templates ride into the Docker image), `watchAssets: true`.
- Port `main-worker.ts` + `worker.module.ts` (Config + Bull + Logger + Prisma +
  Redis + Mail + `QueueModule.register('worker')` + `GracefulShutdownService`).

### Phase 3 — Domain modules
- Port `auth`, `users`, `organisations` (+ `OrganisationAccessService`),
  `files`, `health`, re-pointing the ~11 `generated/prisma/client` imports to
  `@repo/database`. The ~55 `this.prisma.*` calls port verbatim (PrismaService
  now subclasses the client).
- Replace the current minimal health module/test with the terminus-based one.
  The route becomes `GET /api/v1/health` (see Docker healthcheck update).

### Phase 4 — Consumability
- **orval mutator (`@repo/queries/src/mutator/custom-axios.ts`):** unwrap the
  envelope (`return response.data.data`) so generated hooks return the typed
  payload; attach `Authorization: Bearer <token>` from a pluggable token getter
  (default no-op, so a frontend can register a store later). Pagination `meta`
  access is a documented frontend follow-up.
- **Regenerate `@repo/queries`** (`pnpm gen:queries`, API running) and update
  `src/index.ts` to re-export the new tag-split endpoint groups (auth, users,
  organisations, files, health, mail) + model, instead of `minis`.

### Phase 5 — Docker + env
- **Prod compose (`_docker/docker-compose.prod.yml`):** activate the documented
  `redis` (healthcheck) + `worker` (same image, `command: node dist/main-worker.js`)
  services; add `REDIS_HOST/PORT`, `JWT_*`, `SMTP_*`, `S3_*` env to `api` +
  `worker`. **Healthcheck path → `/api/v1/health`.** `migrate` unchanged.
  mailpit never in prod (SMTP → real provider; placeholders in env).
- **Dev compose:** unchanged (redis + mailpit already present; API runs outside
  Docker in dev).
- **Env:** `apps/api/.env(.example)` gets the full API runtime set (NODE_ENV,
  PORT=3001, LOG_LEVEL, API_PREFIX, CORS_ORIGIN, THROTTLE_*, CACHE_TTL,
  ALLOWED_EMAIL_DOMAINS, REGISTRATION_ENABLED, FRONTEND_URL, JWT_* secrets +
  expiry, REDIS_HOST/PORT, SMTP_* + MAIL_FROM + SUPPORT_EMAIL, S3_*). Port
  `generate-jwt-secrets.mjs` as a `secrets` script. `_docker/.env(.example)`
  gains the app-runtime vars the prod `api`/`worker` services need.

## 6. Data model (added to `@repo/database`)

Postgres, UUID PKs, `@updatedAt`, cascade deletes.

- **User** — `name`, `surname`, `email @unique`, `password`, `isActive`,
  `mustChangePassword`, `temporaryPasswordExpiresAt?`, `avatarUrl?`, billing
  (`address/postalCode/city/country/kvk/vatNumber`); relations to
  `memberships`, `refreshTokens`, `activationCodes`, `emailChangeRequests`,
  `files`.
- **RefreshToken / ActivationCode / EmailChangeRequest** — FK→User
  `onDelete: Cascade`; `EmailChangeRequest.token @unique`; indexed on
  `userId` (+ `token`/`code`).
- **Organisation** — `name` + billing (`address/postalCode/city/kvk/vatNumber/iban`)
  + `logoUrl?`; `members`, `files`.
- **OrganisationMember** — `role: OrganisationRole @default(MEMBER)`,
  `@@unique([userId, organisationId])`.
- **File** — `originalName`, `mimeType`, `size`, `key @unique`, `folder`,
  `scope: FileScope`, `userId`, nullable `organisationId`.
- **Enums** — `OrganisationRole {OWNER, MEMBER}`, `FileScope {USER, ORGANISATION}`.

## 7. Endpoint inventory (effective base `/api/v1`)

`JwtAuthGuard` is global → every route is protected unless marked `@Public`.

**auth** — `login`*, `register`*, `activate`*, `resend-activation`*,
`request-new-password`*, `reset-password`*, `refresh`*, `logout`,
`change-password`, `me` (GET), `request-email-change`, `confirm-email-change`*
(`*` = `@Public`; sensitive routes `@Throttle 5/60s`, email-change 3/60s).

**users** — `GET /users`, `GET /users/:id`, `PATCH /users/:id` (self only),
`DELETE /users/:id` (self only); class-level `UserScopedCacheInterceptor`.

**organisations** — `POST /`, `GET /`, `GET /:id`, `PATCH /:id` (owner),
`DELETE /:id` (owner), `GET /:id/members`, `POST /:id/members` (invite; owner),
`PATCH /:id/members/:userId` (owner; last-owner protected),
`DELETE /:id/members/:userId` (owner-or-self; last-owner protected).

**files** — `POST /:scope/:ownerId/:folder` (upload), `PUT …` (replace),
`GET /files`, `GET /files/:id`, `DELETE /files/:id`.

**health** — `GET /health` (`@Public`, `@SkipTransform`). **mail** —
`POST /mail/contact`.

## 8. Security inventory (ported 1:1)

- **Auth:** custom JWT, no Passport, no cookies. Access JWT `{sub,email}` HS256
  (`jwt.secret`, 1h). Refresh: opaque `tokenId.tokenSecret.signature`
  (HMAC-SHA256 over `tokenId.tokenSecret` keyed by `jwt.refreshSecret`;
  `tokenSecret` bcrypt-hashed in DB; rotation + revocation + expiry, 7d).
- **Global guards:** `ThrottlerGuard` then `JwtAuthGuard` (`@Public` opt-out).
- **helmet** (CSP off in dev), **CORS** (`credentials:true`, fixed
  allowed/exposed headers), **request-id** middleware, **ValidationPipe**
  (`whitelist` + `forbidNonWhitelisted` + `transform`).
- **Rate limiting:** `@nestjs/throttler` global (60/60s) + per-route `@Throttle`.
- **Hashing:** bcrypt (`SALT_ROUNDS=10`).
- **`AllExceptionsFilter`:** uniform `ApiErrorResponse`, Prisma error mapping
  (P2002→409, P2025→404, P2003/P2014→400), messages hidden in production.
- **`UserScopedCacheInterceptor`:** namespaces cache keys by `req.user.sub` so
  cached reads never leak across users.
- **File uploads:** magic-byte MIME sniffing, declared-vs-detected match,
  filename sanitisation, 5 MB cap, per-scope access control.
- **Email domain allow-list** (`auth.allowedEmailDomains`) on registration.

## 9. Mail inventory (ported 1:1)

- **Transport:** nodemailer SMTP (dev → mailpit `:1025`, UI `:8025`; prod → real
  provider). **Templating:** Handlebars, compiled per-send from
  `modules/mail/templates/`.
- **Templates (8):** `activation-code`, `welcome`, `reset-password`,
  `password-changed`, `email-change-confirmation`, `email-change-notice`,
  `new-user-credentials`, `support-contact`.
- **Delivery:** all async via the BullMQ `mail` queue → `MailProcessor` (worker
  process only). 3 attempts, exponential backoff, `removeOnComplete`. The API
  never runs the processor.

## 10. How it works (data flow)

**Dev:** `pnpm docker:up` boots postgres + minio + redis + mailpit. The API
(`pnpm dev`) and a worker (`nest start --watch --entryFile main-worker`) run
outside Docker against those. orval regenerates `@repo/queries` from the running
API's `/api/docs-json`.

**Prod (`docker:prod:up`):** Docker builds the image (`turbo prune api --docker`
→ install → `turbo build --filter=api` → prod-deps → runner, with `.hbs`
templates copied into `dist`). postgres/minio/redis become healthy →
`minio-init` makes the bucket → `migrate` runs `prisma migrate deploy` and exits
0 → `api` (`node dist/main.js`) and `worker` (`node dist/main-worker.js`) start;
`api` reports healthy on `GET /api/v1/health`.

**Request:** client sends `Authorization: Bearer <access>` →
`ThrottlerGuard` → `JwtAuthGuard` (attaches `req.user`) → controller →
`TransformInterceptor` wraps the result in `{success,data,meta}`. Auth flows
enqueue mail jobs to Redis; the worker sends them via SMTP.

## 11. Verification

1. `pnpm check-types` and `pnpm build` — api **and** worker entrypoints emit;
   `@repo/database` regenerates with the new models.
2. `pnpm docker:up`; run API + worker locally; smoke flow: `register` →
   activation email in mailpit → `activate` → `login` → `GET /api/v1/auth/me`;
   confirm a mail job runs in the worker logs.
3. `pnpm docker:prod:build` succeeds (validates the `turbo prune` Dockerfile +
   `.hbs` asset copy end-to-end).
4. `pnpm docker:prod:up`: `migrate` exits 0; `api` + `worker` healthy;
   `GET /api/v1/health` returns 200; Swagger at `/api/docs`. `docker:prod:down -v`.
5. `pnpm gen:queries` regenerates `@repo/queries`; `pnpm check-types` passes
   across the workspace; `src/index.ts` re-exports the new endpoint groups.

## 12. Out of scope (YAGNI / later)

- Frontend auth UX: login screens, token storage/refresh, registering a token
  getter on the mutator, pagination-`meta` plumbing into hooks.
- New business endpoints beyond what the boilerplate provides.
- CI/CD, image registry/push, multi-arch builds, remote Turbo cache in Docker.
- Consolidating the three Redis clients (ioredis `RedisService`, BullMQ
  connection, Keyv cache store) — they intentionally share host/port for now.
