# NestJS Boilerplate → `apps/api` Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the full standalone `nestjs-boilerplate` into the tallandtiny monorepo as `apps/api` — all endpoints, security, mailers, queues and the worker — with models in `@repo/database` and the API consumable through the existing orval → `@repo/queries` pipeline.

**Architecture:** This is a faithful **copy-and-adapt port**, not a rewrite. The boilerplate already compiles and runs as a unit; the work is (1) moving its Prisma models into `@repo/database`, (2) copying its `src/common`, `src/config`, `src/modules` and entrypoints into `apps/api`, (3) re-pointing the ~11 `…/generated/prisma/client` imports to `@repo/database` (the ~55 `this.prisma.*` calls port verbatim because `PrismaService extends PrismaClient`), and (4) wiring consumability + Docker. Because the modules are interdependent (auth↔users, files↔org-access, app.module imports them all), the unit of verification is **type-check / build / boot / e2e**, not per-file unit tests. One real e2e smoke test closes the plan.

**Tech Stack:** NestJS 11 (Express), Prisma 7 + `@prisma/adapter-pg`, BullMQ on Redis, AWS S3 SDK v3 → MinIO, nodemailer + Handlebars, nestjs-pino, bcrypt, helmet, `@nestjs/throttler`, pnpm + Turborepo.

## Global Constraints

- **Node** `>=22.12` (root `engines`) — relies on `require(esm)` to consume the ESM `@repo/database` from the CJS NestJS app. Do not change `apps/api` to ESM.
- **`apps/api` TS config:** extends `@repo/typescript-config/nestjs.json` (`module: CommonJS`, `moduleResolution: Node`). `@repo/database` resolves via its `main`/`types` fields. Do **not** add `.js` extensions to imports inside `apps/api`.
- **`@repo/database` TS config:** extends base (`module/moduleResolution: NodeNext`). Relative imports in that package (incl. the seed) **must** use explicit `.js` extensions.
- **Source of truth for copies:** `BP=/Users/tadeuszderuijter/dev/boilerplate/nestjs-boilerplate`. **Destination:** `API=/Users/tadeuszderuijter/dev/tintsmith/apps/api`. Repo root: `/Users/tadeuszderuijter/dev/tintsmith`.
- **API conventions (locked):** URI versioning (`/api/v1`), global prefix `api`, response envelope `{success,statusCode,data,meta,…}`, all global guards/filters/interceptors/pino — ported 1:1. Port **3001**. Swagger served at **`/api/docs`** (JSON at `/api/docs-json`), non-production only.
- **Package manager:** pnpm `10.28.2`. Native deps need allow-listing in root `pnpm.onlyBuiltDependencies`.
- **Strict mode:** `apps/api` inherits `strict: true` (so `strictPropertyInitialization` is on), but the ported class-validator DTOs and `env.validation.ts` declare required fields without initializers (`field: string;`) — the boilerplate ran without that flag. `apps/api/tsconfig.json` sets `"strictPropertyInitialization": false` (the standard NestJS + class-validator setting) so the ported code compiles unchanged. Other strict flags stay on; catch blocks already narrow with `instanceof Error`. (Discovered during Task 1.2 review; applied in Task 1.3.)
- **Commit** after every task. Branch is `develop` (a feature branch — commit directly, no push unless asked).
- Spec: `docs/superpowers/specs/2026-06-24-nestjs-boilerplate-port-api-design.md`.

---

## Phase 0 — Database foundation (`@repo/database`)

### Task 0.1: Merge models into `@repo/database` + reset migration

**Files:**
- Modify: `packages/database/prisma/schema.prisma` (replace `Mini` with the 7 models + 2 enums)
- Delete: `packages/database/prisma/migrations/20260618231838_init/`
- Regenerate: `packages/database/src/generated/prisma/**` (via `prisma generate`)

**Interfaces:**
- Produces: `@repo/database` now exports `User`, `Organisation`, `OrganisationMember`, `RefreshToken`, `ActivationCode`, `EmailChangeRequest`, `File`, enums `OrganisationRole`, `FileScope`, plus `Prisma` and `PrismaClient`. `Mini` is gone.

- [ ] **Step 1: Start dev infra** (Postgres must be up for migrate)

Run: `pnpm docker:up`
Expected: `postgres`, `redis`, `minio`, `mailpit` reach healthy (`docker compose -f _docker/docker-compose.yml ps`).

- [ ] **Step 2: Replace the schema**

Overwrite `packages/database/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum OrganisationRole {
  OWNER
  MEMBER
}

enum FileScope {
  USER
  ORGANISATION
}

model User {
  id                         String               @id @default(uuid())
  name                       String
  surname                    String
  email                      String               @unique
  password                   String
  isActive                   Boolean              @default(false)
  mustChangePassword         Boolean              @default(false)
  temporaryPasswordExpiresAt DateTime?
  avatarUrl                  String?
  address                    String?
  postalCode                 String?
  city                       String?
  country                    String?
  kvk                        String?
  vatNumber                  String?
  memberships                OrganisationMember[]
  refreshTokens              RefreshToken[]
  activationCodes            ActivationCode[]
  emailChangeRequests        EmailChangeRequest[]
  files                      File[]
  createdAt                  DateTime             @default(now())
  updatedAt                  DateTime             @updatedAt
}

model RefreshToken {
  id        String    @id @default(uuid())
  token     String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([token])
}

model ActivationCode {
  id        String   @id @default(uuid())
  code      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([code])
}

model EmailChangeRequest {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  newEmail  String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model Organisation {
  id         String               @id @default(uuid())
  name       String
  address    String?
  postalCode String?
  city       String?
  kvk        String?
  vatNumber  String?
  iban       String?
  logoUrl    String?
  createdAt  DateTime             @default(now())
  updatedAt  DateTime             @updatedAt
  members    OrganisationMember[]
  files      File[]
}

model OrganisationMember {
  id             String           @id @default(uuid())
  userId         String
  organisationId String
  role           OrganisationRole @default(MEMBER)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  organisation   Organisation     @relation(fields: [organisationId], references: [id], onDelete: Cascade)

  @@unique([userId, organisationId])
  @@index([userId])
  @@index([organisationId])
}

model File {
  id             String        @id @default(uuid())
  originalName   String
  mimeType       String
  size           Int
  key            String        @unique
  folder         String
  scope          FileScope
  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organisationId String?
  organisation   Organisation? @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([userId])
  @@index([organisationId])
  @@index([scope])
}
```

- [ ] **Step 3: Drop the old `Mini` migration**

Run: `rm -rf packages/database/prisma/migrations/20260618231838_init`
(Keep `packages/database/prisma/migrations/migration_lock.toml`.)

- [ ] **Step 4: Reset the dev DB, then create one clean migration**

Run:
```bash
cd packages/database
pnpm exec prisma migrate reset --force --skip-seed   # empties the dev DB (drops Mini)
pnpm exec prisma migrate dev --name init --skip-seed # creates + applies the new init, regenerates client
cd ../..
```
Expected: a new folder `packages/database/prisma/migrations/<timestamp>_init/migration.sql` exists; `prisma migrate status` reports the DB up to date.

- [ ] **Step 5: Verify the generated client + types**

Run:
```bash
pnpm --filter @repo/database build
pnpm --filter @repo/database check-types
grep -c "model Mini" packages/database/prisma/schema.prisma   # expect 0
grep -c "model User" packages/database/prisma/schema.prisma    # expect 1
test -d packages/database/src/generated/prisma && echo "client generated"
```
Expected: build + check-types PASS; `model Mini` count `0`, `model User` count `1`; the generated client dir exists. (The regenerated client type-exports `User`/`Organisation`/`File`; that is proven concretely when `apps/api` compiles against them in Phase 1.)

- [ ] **Step 6: Commit**

```bash
git add packages/database/prisma packages/database/src/generated
git commit -m "feat(database): replace Mini with boilerplate domain models"
```

---

### Task 0.2: Port the seed into `@repo/database`

**Files:**
- Create: `packages/database/prisma/seed.ts`
- Create: `packages/database/prisma/seeders/organisation.seeder.ts`
- Create: `packages/database/prisma/seeders/user.seeder.ts`
- Modify: `packages/database/prisma.config.ts` (add `migrations.seed`)
- Modify: `packages/database/package.json` (add `db:seed` script + dev deps `tsx`, `bcrypt`, `@types/bcrypt`)
- Modify: root `package.json` (add `bcrypt` to `pnpm.onlyBuiltDependencies`)

**Interfaces:**
- Consumes: the regenerated client at `packages/database/src/generated/prisma/client.js` (Task 0.1).
- Produces: `pnpm --filter @repo/database db:seed` upserts an org `NIKE BV` + two active users (`lisa.visser@bydeusz.com` OWNER, `john.doe@bydeusz.com` MEMBER), password `Admin123!`.

- [ ] **Step 1: Allow bcrypt's build script (pnpm v10 gates it)**

In root `package.json`, change:
```json
"pnpm": {
  "onlyBuiltDependencies": ["@prisma/engines", "prisma", "bcrypt"]
}
```

- [ ] **Step 2: Add the seed deps + script to `@repo/database`**

In `packages/database/package.json`, add to `scripts`:
```json
"db:seed": "prisma db seed",
```
and to `devDependencies`:
```json
"tsx": "^4.21.0",
"bcrypt": "^6.0.0",
"@types/bcrypt": "^6.0.0",
```

- [ ] **Step 3: Wire the seed in `prisma.config.ts`**

In `packages/database/prisma.config.ts`, add `seed` under `migrations`:
```ts
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
```

- [ ] **Step 4: Create `packages/database/prisma/seeders/organisation.seeder.ts`**

```ts
import { PrismaClient } from '../../src/generated/prisma/client.js';

export interface SeededOrganisationIds {
  nike: string;
}

const organisations: Array<{
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  kvk?: string;
  vatNumber?: string;
  iban?: string;
}> = [
  {
    id: '95ea1d7c-9552-4ea8-9d17-bf305f1246b7',
    name: 'NIKE BV',
    address: 'Zuiderpark 1',
    postalCode: '2011 EJ',
    city: 'Amsterdam',
    kvk: '12345678',
    vatNumber: 'NL123456789B01',
    iban: 'NL91ABNA0417164300',
  },
];

export async function seedOrganisations(
  prisma: PrismaClient,
): Promise<SeededOrganisationIds> {
  for (const organisation of organisations) {
    await prisma.organisation.upsert({
      where: { id: organisation.id },
      update: { ...organisation },
      create: { ...organisation },
    });
  }

  return { nike: organisations[0]!.id };
}
```

- [ ] **Step 5: Create `packages/database/prisma/seeders/user.seeder.ts`**

(Boilerplate copy with the `generated/prisma/client` path given `.js`, and `hashPassword` replaced by inline `bcrypt`.)

```ts
import bcrypt from 'bcrypt';
import {
  OrganisationRole,
  PrismaClient,
} from '../../src/generated/prisma/client.js';
import type { SeededOrganisationIds } from './organisation.seeder.js';

interface SeedUser {
  name: string;
  surname: string;
  email: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  kvk?: string;
  vatNumber?: string;
  organisations: Array<{ organisationId: string; role: OrganisationRole }>;
}

export async function seedUsers(
  prisma: PrismaClient,
  organisationIds: SeededOrganisationIds,
): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users: SeedUser[] = [
    {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@bydeusz.com',
      address: 'Damrak 70',
      postalCode: '1012 LM',
      city: 'Amsterdam',
      country: 'NL',
      organisations: [
        { organisationId: organisationIds.nike, role: OrganisationRole.MEMBER },
      ],
    },
    {
      name: 'Lisa',
      surname: 'Visser',
      email: 'lisa.visser@bydeusz.com',
      address: 'Coolsingel 100',
      postalCode: '3011 AG',
      city: 'Rotterdam',
      country: 'NL',
      kvk: '87654321',
      vatNumber: 'NL987654321B01',
      organisations: [
        { organisationId: organisationIds.nike, role: OrganisationRole.OWNER },
      ],
    },
  ];

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        surname: user.surname,
        password: passwordHash,
        isActive: true,
        address: user.address ?? null,
        postalCode: user.postalCode ?? null,
        city: user.city ?? null,
        country: user.country ?? null,
        kvk: user.kvk ?? null,
        vatNumber: user.vatNumber ?? null,
      },
      create: {
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: passwordHash,
        isActive: true,
        address: user.address,
        postalCode: user.postalCode,
        city: user.city,
        country: user.country,
        kvk: user.kvk,
        vatNumber: user.vatNumber,
      },
    });

    for (const membership of user.organisations) {
      await prisma.organisationMember.upsert({
        where: {
          userId_organisationId: {
            userId: created.id,
            organisationId: membership.organisationId,
          },
        },
        update: { role: membership.role },
        create: {
          userId: created.id,
          organisationId: membership.organisationId,
          role: membership.role,
        },
      });
    }
  }
}
```

- [ ] **Step 6: Create `packages/database/prisma/seed.ts`**

```ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedOrganisations } from './seeders/organisation.seeder.js';
import { seedUsers } from './seeders/user.seeder.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');
  const organisationIds = await seedOrganisations(prisma);
  await seedUsers(prisma, organisationIds);
  console.log('Seeding completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
```

- [ ] **Step 7: Install + run the seed**

Run:
```bash
pnpm install
pnpm --filter @repo/database db:seed
```
Expected: install completes and runs bcrypt's build script (allow-listed); seed prints `Seeding completed.` with no error.

- [ ] **Step 8: Verify the seeded rows**

Run:
```bash
pnpm --filter @repo/database exec prisma studio --browser none --port 5599 &
sleep 2 && kill %1
# Or a quick check:
docker compose -f _docker/docker-compose.yml exec -T postgres psql -U tallandtiny -d tallandtiny -c "select email, \"isActive\" from \"User\";"
```
Expected: two users (`john.doe@bydeusz.com`, `lisa.visser@bydeusz.com`), both `isActive = t`.

- [ ] **Step 9: Commit**

```bash
git add packages/database/prisma packages/database/package.json packages/database/prisma.config.ts package.json pnpm-lock.yaml
git commit -m "feat(database): port boilerplate seed (org + users)"
```

---

## Phase 1 — Port the NestJS app into `apps/api`

### Task 1.1: Dependencies, env, and JWT-secrets script

**Files:**
- Modify: `apps/api/package.json` (deps + worker scripts)
- Create: `apps/api/.env` and `apps/api/.env.example`
- Create: `apps/api/scripts/generate-jwt-secrets.mjs`

**Interfaces:**
- Produces: `apps/api` has every runtime dependency the ported modules import, and a `.env` with all required vars so the app can boot in Task 1.4.

- [ ] **Step 1: Replace `apps/api/package.json`**

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "dev:worker": "nest start --watch --entryFile main-worker",
    "start": "node dist/main.js",
    "start:worker": "node dist/main-worker.js",
    "secrets": "node scripts/generate-jwt-secrets.mjs",
    "lint": "eslint \"src/**/*.ts\"",
    "check-types": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json --passWithNoTests"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1000.0",
    "@aws-sdk/s3-request-presigner": "^3.1000.0",
    "@keyv/redis": "^5.1.6",
    "@nestjs/bullmq": "^11.0.4",
    "@nestjs/cache-manager": "^3.1.0",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@nestjs/terminus": "^11.1.1",
    "@nestjs/throttler": "^6.5.0",
    "@prisma/adapter-pg": "^7.0.0",
    "@repo/database": "workspace:*",
    "bcrypt": "^6.0.0",
    "bullmq": "^5.70.1",
    "cache-manager": "^7.2.8",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "dotenv": "^16.4.0",
    "handlebars": "^4.7.8",
    "helmet": "^8.1.0",
    "ioredis": "^5.10.0",
    "ms": "^2.1.3",
    "nestjs-pino": "^4.6.0",
    "nodemailer": "^8.0.1",
    "pg": "^8.13.0",
    "pino-http": "^11.0.0",
    "pino-roll": "^4.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/bcrypt": "^6.0.0",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/ms": "^2.1.0",
    "@types/multer": "^2.0.0",
    "@types/node": "^22.10.0",
    "@types/nodemailer": "^7.0.11",
    "@types/pg": "^8.11.0",
    "@types/supertest": "^6.0.2",
    "eslint": "^9.17.0",
    "jest": "^29.7.0",
    "pino-pretty": "^13.1.3",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/scripts/generate-jwt-secrets.mjs`**

```js
import { randomBytes } from 'node:crypto';

const accessSecret = randomBytes(64).toString('hex');
const refreshSecret = randomBytes(64).toString('hex');

console.log('Generated JWT secrets:\n');
console.log(`JWT_SECRET=${accessSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
```

- [ ] **Step 3: Install**

Run: `pnpm install`
Expected: completes; `apps/api/node_modules` populated, bcrypt builds.

- [ ] **Step 4: Generate JWT secrets**

Run: `pnpm --filter api secrets`
Expected: prints `JWT_SECRET=…` and `JWT_REFRESH_SECRET=…`. Copy these into the `.env` in the next step.

- [ ] **Step 5: Create `apps/api/.env`** (paste the secrets from Step 4)

```dotenv
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:3003
THROTTLE_TTL=60000
THROTTLE_LIMIT=60
CACHE_TTL=60000
ALLOWED_EMAIL_DOMAINS=bydeusz.com
REGISTRATION_ENABLED=true
FRONTEND_URL=http://localhost:3000

JWT_SECRET=<paste from `pnpm --filter api secrets`>
JWT_REFRESH_SECRET=<paste from `pnpm --filter api secrets`>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

DATABASE_URL=postgresql://tallandtiny:tallandtiny@localhost:5432/tallandtiny?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Tall & Tiny <noreply@tallandtiny.app>"
SUPPORT_EMAIL=support@tallandtiny.app

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=tallandtiny
S3_SECRET_KEY=tallandtiny-secret
S3_BUCKET=tallandtiny
```

- [ ] **Step 6: Create `apps/api/.env.example`** — identical to `.env` but with the two JWT secrets blanked:

```dotenv
JWT_SECRET=
JWT_REFRESH_SECRET=
```
(and all other values as above).

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/.env.example apps/api/scripts pnpm-lock.yaml
git commit -m "chore(api): add boilerplate dependencies, env, and secrets script"
```
(`.env` is gitignored — only `.env.example` is committed.)

---

### Task 1.2: Port `config/`, `common/`, and `prisma/`

**Files:**
- Copy: `$BP/src/config` → `$API/src/config`
- Copy: `$BP/src/common` → `$API/src/common`
- Create: `$API/src/prisma/prisma.service.ts` (replace existing)
- Create: `$API/src/prisma/prisma.module.ts` (replace existing)
- Modify: `$API/src/config/configuration.ts` + `env.validation.ts` (port-default tweaks)

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` (importable as `from '../prisma/prisma.service'`), the global `PrismaModule`, all `common/*` exports (decorators, dto, filters, guards, interceptors, interfaces, logger, middleware, services, utils), and the `configuration` + `validate` config exports.

- [ ] **Step 1: Copy config + common**

```bash
BP=/Users/tadeuszderuijter/dev/boilerplate/nestjs-boilerplate
API=/Users/tadeuszderuijter/dev/tintsmith/apps/api
cp -R "$BP/src/config" "$API/src/config"
cp -R "$BP/src/common" "$API/src/common"
find "$API/src/config" "$API/src/common" -name '.DS_Store' -delete
```

- [ ] **Step 2: Re-point the Prisma type import in the exceptions filter**

The only `generated/prisma/client` import under `common/` is in `all-exceptions.filter.ts`. Re-point it:
```bash
sed -i '' -E "s#['\"][./]+generated/prisma/client['\"]#'@repo/database'#g" "$API/src/common/filters/all-exceptions.filter.ts"
```
Verify: `grep -n "@repo/database" "$API/src/common/filters/all-exceptions.filter.ts"` shows `import { Prisma } from '@repo/database';`.

- [ ] **Step 3: Adjust config defaults to tallandtiny (port 3001)**

In `$API/src/config/configuration.ts`, change the port default:
```ts
  port: parseInt(process.env.PORT ?? '3001', 10),
```
In `$API/src/config/env.validation.ts`, change the `PORT` default:
```ts
  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number = 3001;
```

- [ ] **Step 4: Write `$API/src/prisma/prisma.service.ts`**

```ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>('database.url');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting Prisma client...');
    await this.$disconnect();
    this.logger.log('Prisma client disconnected');
  }
}
```

- [ ] **Step 5: Write `$API/src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 6: Verify the re-point + that the new Prisma files are in place**

A full `check-types` is intentionally deferred to Task 1.4 — the old `app.module.ts`/`minis` still reference the removed `Mini` and the old `.db` wrapper, so the app cannot compile as a whole until the swap in 1.4. (Per-file `tsc` is not a valid check here: passing files to `tsc` directly ignores `tsconfig.json`, so decorators/module-resolution would report false errors.) For now confirm the mechanical change:

```bash
grep -n "@repo/database" "$API/src/common/filters/all-exceptions.filter.ts"   # -> import { Prisma } from '@repo/database';
test -f "$API/src/prisma/prisma.service.ts" && test -f "$API/src/prisma/prisma.module.ts" && echo "prisma files present"
```
Expected: the filter imports `Prisma` from `@repo/database`; both prisma files exist. The green type-check gate arrives in Task 1.4.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/config apps/api/src/common apps/api/src/prisma
git commit -m "feat(api): port config, common, and Prisma service from boilerplate"
```

---

### Task 1.3: Port all feature modules

**Files:**
- Modify: `apps/api/tsconfig.json` (add `"strictPropertyInitialization": false`)
- Copy: `$BP/src/modules` → `$API/src/modules` (auth, users, organisations, files, mail, queue, redis, storage, health — incl. 8 `.hbs` templates)
- Delete: copied `*.spec.ts`, `*.prisma`, `.DS_Store`

**Interfaces:**
- Consumes: `PrismaService` / `PrismaModule` (Task 1.2), `@repo/database` model types, `common/*`.
- Produces: `AuthModule`, `UsersModule`, `OrganisationsModule` (+ exported `OrganisationAccessService`), `FilesModule`, `MailModule` (exports `MailService`), `QueueModule.register(mode)`, `RedisModule` (`@Global`), `StorageModule` (`@Global`), `HealthModule` — exactly the symbols `app.module.ts`/`worker.module.ts` import.

- [ ] **Step 0: Relax `strictPropertyInitialization` (class-validator DTOs need it)**

The boilerplate's DTOs and `env.validation.ts` declare required fields without initializers (`field: string;`). tallandtiny's base config is `strict: true`, which turns on `strictPropertyInitialization`. Add the standard NestJS override so the ported code compiles unchanged — write `apps/api/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "strictPropertyInitialization": false
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 1: Copy the modules tree**

```bash
BP=/Users/tadeuszderuijter/dev/boilerplate/nestjs-boilerplate
API=/Users/tadeuszderuijter/dev/tintsmith/apps/api
cp -R "$BP/src/modules" "$API/src/modules"
```

- [ ] **Step 2: Strip the model `.prisma` files (models now live in `@repo/database`), boilerplate specs, and cruft**

```bash
find "$API/src/modules" -name '*.prisma' -delete
find "$API/src/modules" -name '*.spec.ts' -delete
find "$API/src/modules" -name '.DS_Store' -delete
```

- [ ] **Step 3: Re-point every `generated/prisma/client` import to `@repo/database`**

```bash
grep -rl "generated/prisma/client" "$API/src/modules" \
  | xargs sed -i '' -E "s#['\"][./]+generated/prisma/client['\"]#'@repo/database'#g"
```
Verify no stragglers remain:
```bash
grep -rn "generated/prisma/client" "$API/src" || echo "OK: no generated-client imports left"
```
Expected: `OK: no generated-client imports left`.

- [ ] **Step 4: Confirm the mail templates came across**

Run: `ls "$API/src/modules/mail/templates"`
Expected: 8 `.hbs` files (`activation-code`, `welcome`, `reset-password`, `password-changed`, `email-change-confirmation`, `email-change-notice`, `new-user-credentials`, `support-contact`).

- [ ] **Step 5: Type-check the modules** (app.module still old; expect only "cannot find AppModule symbols" noise, no errors inside modules)

Run: `pnpm --filter api exec tsc --noEmit 2>&1 | grep -E "src/modules" | head -40`
Expected: no errors under `src/modules` (module internals resolve against `@repo/database` + `common` + `prisma`). Any remaining errors should be in `src/app.module.ts`/`src/main.ts`/`src/minis` — fixed in Task 1.4.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules
git commit -m "feat(api): port auth, users, organisations, files, mail, queue, redis, storage, health modules"
```

---

### Task 1.4: Bootstrap, worker, nest-cli assets — make it compile, build, and boot

**Files:**
- Create: `$API/src/main.ts` (replace — tallandtiny adaptations)
- Copy: `$BP/src/app.module.ts` → `$API/src/app.module.ts` (replace; no edits needed)
- Copy: `$BP/src/worker.module.ts` → `$API/src/worker.module.ts`
- Copy: `$BP/src/main-worker.ts` → `$API/src/main-worker.ts`
- Modify: `$API/nest-cli.json` (add `.hbs` asset rule)
- Delete: `$API/src/minis/`, `$API/src/health/` (old minimal health)

**Interfaces:**
- Consumes: every module from Task 1.3, `common/*`, `config/*`, `prisma/*`.
- Produces: HTTP entry `dist/main.js` and worker entry `dist/main-worker.js`; routes under `/api/v1/...`; Swagger at `/api/docs`.

- [ ] **Step 1: Copy `app.module.ts`, `worker.module.ts`, `main-worker.ts` verbatim**

```bash
BP=/Users/tadeuszderuijter/dev/boilerplate/nestjs-boilerplate
API=/Users/tadeuszderuijter/dev/tintsmith/apps/api
cp "$BP/src/app.module.ts" "$API/src/app.module.ts"
cp "$BP/src/worker.module.ts" "$API/src/worker.module.ts"
cp "$BP/src/main-worker.ts" "$API/src/main-worker.ts"
```
(These import only `./config`, `./common`, `./modules/*`, `./prisma/*` — all present, no generated-client imports.)

- [ ] **Step 2: Write `$API/src/main.ts`** (tallandtiny: port 3001, Swagger at `/api/docs`, banner)

```ts
import 'dotenv/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api';
  const port = configService.get<number>('port') ?? 3001;
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';
  const isProduction = nodeEnv === 'production';

  app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));
  app.use(requestIdMiddleware);
  app.enableCors({
    origin: configService.get<string | string[]>('cors.origins'),
    methods: configService.get<string>('cors.methods'),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: configService.get<number>('cors.maxAge'),
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tall & Tiny API')
      .setDescription('API for tallandtiny — a tool for miniature painters')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocumentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocumentFactory, {
      jsonDocumentUrl: `${apiPrefix}/docs-json`,
    });
  }

  await app.listen(port);

  const logger = app.get(Logger);
  const base = `http://localhost:${port}`;
  logger.log('🎨 Tall & Tiny API ready');
  logger.log(`├─ API:        ${base}/${apiPrefix}/v1`);
  logger.log(`├─ Swagger UI: ${base}/${apiPrefix}/docs`);
  logger.log(`└─ OpenAPI:    ${base}/${apiPrefix}/docs-json`);
}
void bootstrap();
```

- [ ] **Step 3: Add the `.hbs` asset rule — write `$API/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [{ "include": "**/*.hbs", "watchAssets": true }],
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": { "introspectComments": true }
      }
    ]
  }
}
```

- [ ] **Step 4: Remove the old sample + minimal health**

```bash
rm -rf "$API/src/minis" "$API/src/health"
```

- [ ] **Step 5: Type-check the whole app — must be green**

Run: `pnpm --filter api check-types`
Expected: PASS (zero errors).

- [ ] **Step 6: Build — both entrypoints must emit**

Run:
```bash
pnpm --filter api build
ls apps/api/dist/main.js apps/api/dist/main-worker.js
ls apps/api/dist/modules/mail/templates/*.hbs | head
```
Expected: both JS entrypoints exist; the 8 `.hbs` templates are present under `dist/modules/mail/templates`.

- [ ] **Step 7: Boot the API against dev infra**

Run (infra from Task 0.1 still up; DB migrated + seeded):
```bash
( cd apps/api && node dist/main.js ) &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/health
curl -s http://localhost:3001/api/docs-json | head -c 80
kill %1
```
Expected: health returns `200`; the OpenAPI JSON starts with `{"openapi":"3...`.

- [ ] **Step 8: Boot the worker (sanity)**

Run:
```bash
( cd apps/api && node dist/main-worker.js ) &
sleep 4
# Expect a pino log line: "Worker started, processing queue jobs..."
kill %1
```
Expected: the worker logs `Worker started, processing queue jobs...` and stays up (connects to Redis) without throwing.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/worker.module.ts apps/api/src/main-worker.ts apps/api/nest-cli.json
git rm -r --cached apps/api/src/minis apps/api/src/health 2>/dev/null || true
git commit -m "feat(api): wire bootstrap, worker entrypoint, and hbs assets; remove minis sample"
```

---

## Phase 2 — Consumability (`@repo/queries`)

### Task 2.1: Envelope-unwrapping, bearer-ready orval mutator

**Files:**
- Modify: `packages/queries/src/mutator/custom-axios.ts`

**Interfaces:**
- Produces: `customAxios` (unwraps the `{success,…,data}` envelope to the typed payload) and `setAuthTokenGetter(getter)` for frontends to register a bearer-token source.

- [ ] **Step 1: Replace `packages/queries/src/mutator/custom-axios.ts`**

```ts
import Axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
});

// Pluggable bearer-token source. A frontend registers its token getter once
// (e.g. from its auth store); defaults to no token.
let authTokenGetter: () => string | null | undefined = () => undefined;
export const setAuthTokenGetter = (
  getter: () => string | null | undefined,
): void => {
  authTokenGetter = getter;
};

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = authTokenGetter();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The API wraps every successful response in
// { success, statusCode, data, meta, ... }. Unwrap to the typed payload so the
// generated hooks return `data` directly. Raw responses (e.g. @SkipTransform
// health) pass through untouched.
export const customAxios = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then((response: AxiosResponse) => {
    const body = response.data;
    return (
      body && typeof body === 'object' && 'success' in body && 'data' in body
        ? body.data
        : body
    ) as T;
  });

  // @ts-expect-error allow react-query to cancel the request
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm --filter @repo/queries check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/queries/src/mutator/custom-axios.ts
git commit -m "feat(queries): unwrap response envelope and add pluggable bearer token"
```

---

### Task 2.2: Regenerate `@repo/queries` from the new API

**Files:**
- Regenerate: `packages/queries/src/generated/**` (orval, `clean: true`)
- Modify: `packages/queries/src/index.ts`

**Interfaces:**
- Consumes: the running API's OpenAPI at `http://localhost:3001/api/docs-json` (Task 1.4) — controllers carry `@ApiTags('Auth'|'Users'|'Organisations'|'Files'|'Health'|'Mail')`, so orval `tags-split` emits one dir per tag.
- Produces: React Query hooks for every endpoint group, re-exported from `@repo/queries`.

- [ ] **Step 1: Start the API (orval reads its live spec)**

```bash
pnpm docker:up
( cd apps/api && node dist/main.js ) &   # or: pnpm --filter api dev
sleep 4
```

- [ ] **Step 2: Regenerate**

Run: `pnpm --filter @repo/queries gen:queries`
Expected: `clean` wipes the old `minis` output; new dirs appear. Verify:
```bash
ls packages/queries/src/generated/endpoints
```
Expected: directories `auth`, `users`, `organisations`, `files`, `health`, `mail` (exact casing per orval; confirm in the next step).

- [ ] **Step 3: Update `packages/queries/src/index.ts`** to re-export the generated groups + the token setter. Adjust the paths to match the dir/file names printed in Step 2:

```ts
export * from './generated/endpoints/auth/auth';
export * from './generated/endpoints/users/users';
export * from './generated/endpoints/organisations/organisations';
export * from './generated/endpoints/files/files';
export * from './generated/endpoints/health/health';
export * from './generated/endpoints/mail/mail';
export * from './generated/model';
export { setAuthTokenGetter } from './mutator/custom-axios';
```

- [ ] **Step 4: Type-check the workspace (catch any frontend that imported the removed `minis` hooks)**

Run: `pnpm check-types`
Expected: PASS. If a frontend (`web`/`dashboard`/`website`) referenced `minis` hooks, remove those references (they were sample wiring) until the type-check is green.

- [ ] **Step 5: Stop the API and commit**

```bash
kill %1 2>/dev/null || true
git add packages/queries/src
git commit -m "feat(queries): regenerate client from ported API endpoints"
```

---

## Phase 3 — Docker + production env

### Task 3.1: Production env vars (`_docker/.env`)

**Files:**
- Modify: `_docker/.env` and `_docker/.env.example`

**Interfaces:**
- Produces: the app-runtime vars the prod `api` + `worker` containers require at boot (env-validation mandates `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `ALLOWED_EMAIL_DOMAINS`).

- [ ] **Step 1: Append app-runtime vars to `_docker/.env`** (generate fresh secrets with `pnpm --filter api secrets`)

```dotenv

# ── App runtime (prod api + worker) ──────────────────────────────
JWT_SECRET=<paste from `pnpm --filter api secrets`>
JWT_REFRESH_SECRET=<paste from `pnpm --filter api secrets`>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:3003
ALLOWED_EMAIL_DOMAINS=bydeusz.com
REGISTRATION_ENABLED=true
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
# Prod SMTP — point at a real provider (mailpit is dev-only, never in prod)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Tall & Tiny <noreply@tallandtiny.app>"
SUPPORT_EMAIL=support@tallandtiny.app
```

- [ ] **Step 2: Mirror into `_docker/.env.example`** with `JWT_SECRET=` / `JWT_REFRESH_SECRET=` blank and `SMTP_*` blank.

- [ ] **Step 3: Commit**

```bash
git add _docker/.env.example
git commit -m "chore(docker): add prod app-runtime env (jwt, cors, smtp, auth)"
```
(`_docker/.env` is gitignored.)

---

### Task 3.2: Dockerfile — compile bcrypt on Alpine

**Files:**
- Modify: `_docker/Dockerfile`

**Interfaces:**
- Produces: an image whose `node_modules` contains a working compiled `bcrypt` native binding for musl/Alpine.

- [ ] **Step 1: Add build toolchain to the `build` stage**

In `_docker/Dockerfile`, immediately after `FROM base AS build`, add:
```dockerfile
# bcrypt is a native module; Alpine (musl) compiles it from source.
RUN apk add --no-cache python3 make g++
```

- [ ] **Step 2: Add the same toolchain to the `prod-deps` stage**

Immediately after `FROM base AS prod-deps`, add:
```dockerfile
RUN apk add --no-cache python3 make g++
```

- [ ] **Step 3: Verify the image builds end-to-end**

Run: `pnpm docker:prod:build`
Expected: build completes through `migrator` and `runner` targets; no `node-gyp`/bcrypt errors. (`bcrypt` is allow-listed in root `pnpm.onlyBuiltDependencies` from Task 0.2, so pnpm runs its build script.)

- [ ] **Step 4: Commit**

```bash
git add _docker/Dockerfile
git commit -m "fix(docker): install build toolchain so bcrypt compiles on alpine"
```

---

### Task 3.3: Production compose — activate redis + worker

**Files:**
- Modify: `_docker/docker-compose.prod.yml`

**Interfaces:**
- Produces: a prod stack of `postgres`, `minio` (+init), `redis`, `migrate`, `api`, `worker`. `api` healthcheck hits `/api/v1/health`. `api` + `worker` receive the full required env.

- [ ] **Step 1: Add the `redis` service** (place before `migrate`):

```yaml
  redis:
    image: redis:7
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10
```

- [ ] **Step 2: Replace the `api` service's `environment:` and `healthcheck:`** with the full set + versioned health path:

```yaml
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET: ${MINIO_BUCKET}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
      JWT_REFRESH_EXPIRATION: ${JWT_REFRESH_EXPIRATION}
      CORS_ORIGIN: ${CORS_ORIGIN}
      ALLOWED_EMAIL_DOMAINS: ${ALLOWED_EMAIL_DOMAINS}
      REGISTRATION_ENABLED: ${REGISTRATION_ENABLED}
      FRONTEND_URL: ${FRONTEND_URL}
      LOG_LEVEL: ${LOG_LEVEL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      MAIL_FROM: ${MAIL_FROM}
      SUPPORT_EMAIL: ${SUPPORT_EMAIL}
      PORT: ${PORT}
      NODE_ENV: production
    ports:
      - "${PORT}:${PORT}"
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://localhost:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

- [ ] **Step 3: Add the `worker` service** (after `api`) — same image, worker command, same required env:

```yaml
  worker:
    build:
      context: ..
      dockerfile: _docker/Dockerfile
      target: runner
    command: ["node", "dist/main-worker.js"]
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET: ${MINIO_BUCKET}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
      JWT_REFRESH_EXPIRATION: ${JWT_REFRESH_EXPIRATION}
      CORS_ORIGIN: ${CORS_ORIGIN}
      ALLOWED_EMAIL_DOMAINS: ${ALLOWED_EMAIL_DOMAINS}
      REGISTRATION_ENABLED: ${REGISTRATION_ENABLED}
      FRONTEND_URL: ${FRONTEND_URL}
      LOG_LEVEL: ${LOG_LEVEL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      MAIL_FROM: ${MAIL_FROM}
      SUPPORT_EMAIL: ${SUPPORT_EMAIL}
      NODE_ENV: production
    depends_on:
      migrate:
        condition: service_completed_successfully
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
```

- [ ] **Step 4: Uncomment `redis-data` under `volumes:`** and delete the old commented "Later (nestjs-boilerplate port)" block:

```yaml
volumes:
  postgres-data:
  minio-data:
  redis-data:
```

- [ ] **Step 5: Verify config + run the prod stack**

Run:
```bash
docker compose -f _docker/docker-compose.prod.yml --env-file _docker/.env config >/dev/null && echo "compose OK"
pnpm docker:prod:build
pnpm docker:prod:up
sleep 30
docker compose -f _docker/docker-compose.prod.yml --env-file _docker/.env ps
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/health
```
Expected: `compose OK`; `migrate` exited 0; `api` + `worker` + `redis` healthy/up; health returns `200`.

- [ ] **Step 6: Tear down and commit**

```bash
pnpm docker:prod:down
git add _docker/docker-compose.prod.yml
git commit -m "feat(docker): activate redis + worker in prod compose; version health path"
```

---

## Phase 4 — Verification

### Task 4.1: Auth e2e smoke test

**Files:**
- Create: `apps/api/test/auth.e2e-spec.ts`
- Create: `apps/api/test/jest-e2e.json`

**Interfaces:**
- Consumes: a running Postgres + Redis (dev infra) with the DB migrated + seeded (Task 0.2); the seeded user `lisa.visser@bydeusz.com` / `Admin123!`.
- Produces: an automated proof that auth + global guard + Prisma + the response envelope work end-to-end.

- [ ] **Step 1: Create `apps/api/test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 2: Write the failing test `apps/api/test/auth.e2e-spec.ts`**

```ts
import 'dotenv/config';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health → 200', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('logs in a seeded user and returns the current user from /me', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'lisa.visser@bydeusz.com', password: 'Admin123!' })
      .expect(200);

    // Response is wrapped in the { success, data } envelope.
    const accessToken = login.body.data.access_token as string;
    expect(typeof accessToken).toBe('string');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(me.body.data.email).toBe('lisa.visser@bydeusz.com');
  });

  it('rejects /me without a token → 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails first (e.g. before seed / wrong wiring), then make infra green**

Run (infra up, DB seeded):
```bash
pnpm docker:up
pnpm --filter @repo/database db:seed
pnpm --filter api test:e2e
```
Expected on first run with everything wired: PASS. If `login` 401s, confirm the seed ran (`isActive = true`) and `DATABASE_URL`/`REDIS_*` in `apps/api/.env` point at the dev infra.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test
git commit -m "test(api): auth e2e smoke (login + me + guard) against seeded data"
```

---

### Task 4.2: Full-stack verification checklist

**Files:** none (verification only).

- [ ] **Step 1: Workspace type-check + build**

Run: `pnpm check-types && pnpm build`
Expected: every package + app passes; `apps/api/dist/main.js` and `dist/main-worker.js` emit.

- [ ] **Step 2: Dev smoke (manual mail flow through the worker)**

Run:
```bash
pnpm docker:up
( cd apps/api && node dist/main.js ) &
( cd apps/api && node dist/main-worker.js ) &
sleep 4
# Register a new user (REGISTRATION_ENABLED=true, domain bydeusz.com allowed)
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","surname":"User","email":"test.user@bydeusz.com","password":"Admin123!"}'
```
Expected: HTTP 200/201 envelope; the **worker** logs a completed `send-mail` job; an activation email appears in mailpit at `http://localhost:8025`. Stop both processes afterward.

- [ ] **Step 3: Production stack**

Run:
```bash
pnpm docker:prod:build
pnpm docker:prod:up
sleep 30
docker compose -f _docker/docker-compose.prod.yml --env-file _docker/.env ps
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/health
pnpm docker:prod:down
```
Expected: `migrate` exits 0; `api`, `worker`, `redis`, `postgres`, `minio` healthy; health `200`.

- [ ] **Step 4: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(api): finalize boilerplate port verification" || echo "nothing to commit"
```

---

## Self-Review notes (coverage map)

- Spec §2 (DB → `@repo/database`, remove `Mini`) → Task 0.1. Seed → Task 0.2.
- Spec §3 (PrismaService subclass, re-point imports, `@prisma/adapter-pg`+`pg`) → Tasks 1.1–1.3.
- Spec §4 (bootstrap: helmet, CORS, versioning, envelope, pino, swagger `/api/docs`, port 3001) → Tasks 1.2 (config/common) + 1.4 (main.ts/app.module).
- Spec §5 (all modules + `.hbs` assets + worker) → Tasks 1.3, 1.4.
- Spec §6 (orval mutator unwrap + bearer, regen, index.ts) → Tasks 2.1, 2.2.
- Spec §7 (redis + worker prod, healthcheck `/api/v1/health`, env split) → Tasks 3.1–3.3.
- Spec §8 (env + secrets script) → Tasks 1.1, 3.1.
- Spec §9 (verification) → Tasks 4.1, 4.2.
- Spec §10 out-of-scope (frontend auth UX, new endpoints, CI/CD) → not in any task (correct).
