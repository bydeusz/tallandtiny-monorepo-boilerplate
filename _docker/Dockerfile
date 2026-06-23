# syntax=docker/dockerfile:1

# ── Base: Node 22 (alpine) with pnpm via corepack ─────────────────────
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# ── Prune the monorepo down to what `api` needs ───────────────────────
FROM base AS prune
COPY . .
# turbo is a root devDependency; run the pruner via pnpm dlx so we don't
# install the whole workspace first. --docker splits manifests from source.
RUN pnpm dlx turbo@2 prune api --docker

# ── Install all deps, then build api (+ its deps) ─────────────────────
FROM base AS build
# bcrypt is a native module; Alpine (musl) compiles it from source.
RUN apk add --no-cache python3 make g++
# Dummy DATABASE_URL so `prisma generate` (run by `turbo build`) never trips
# on a missing env var. Never used at runtime — real value comes from compose.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Install dependencies first (changes less often than source -> better caching)
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile
# Bring in the pruned source and build (runs db:generate -> build @repo/database -> build api)
COPY --from=prune /app/out/full/ .
RUN pnpm turbo build --filter=api

# ── Production-only dependencies ──────────────────────────────────────
FROM base AS prod-deps
RUN apk add --no-cache python3 make g++
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod

# ── Migrator: runs `prisma migrate deploy` then exits ─────────────────
FROM build AS migrator
WORKDIR /app/packages/database
CMD ["pnpm", "run", "db:deploy"]

# ── Runner: production api ────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
# pnpm's workspace node_modules layout (root .pnpm store + per-package symlinks)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
# Built artifacts: api dist + database dist (incl. the compiled generated Prisma client)
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
USER nestjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
