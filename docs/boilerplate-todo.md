# Boilerplate TODO — wat nog toevoegen

Afgeleid van [`boilerplate-research.md`](./boilerplate-research.md), afgezet tegen de huidige codebase.
Gefilterd: alleen items die **nog niet** aanwezig zijn staan als to-do. Volgorde ≈ leverage/impact.

## Huidige stack (referentie — al aanwezig, niet meer doen)

- **Monorepo**: Turborepo + pnpm workspaces, `@turbo/gen` aanwezig voor scaffolding.
- **Apps**: `api` (NestJS 11), `dashboard` (= manager / back-office app), `web`, `website` (Next 16 / React 19 / Tailwind 4).
- **Packages**: `auth`, `database` (Prisma 7 + `@prisma/adapter-pg`), `queries`, `ui` (atomic design: atoms/molecules/organisms), `i18n` (next-intl), `eslint-config`, `typescript-config`, `vitest-config`.
- **API-contract → type safety**: `@nestjs/swagger` (OpenAPI) + **orval** genereert de getypte client in `packages/queries`. ✅ Dit is precies het aanbevolen NestJS-pad — tRPC vermijden.
- **Al gewired in `api`**: JWT + bcrypt auth, `@nestjs/throttler` (rate limiting), BullMQ (jobs), cache-manager + Redis, `helmet`, `nestjs-pino` (logging), `@nestjs/terminus` (health), Nodemailer + Handlebars (mail), S3 + presigned URLs (storage), class-validator/-transformer.
- **Testing**: Vitest presets (node/react/nest/integration/e2e) + test scripts.
- **Deploy**: Docker compose dev + prod (Coolify-vriendelijk).
- **AI/agents**: `.agents/`, `.claude/`, `CLAUDE.md`, graphify-out.

---

## Tier 1 — DX-fundament & CI (goedkoop, maakt de template deelbaar)

- [ ] **Typed env-validatie** — nu geen enkele `createEnv`/T3 Env gevonden; `.env.example` is maar 11 regels. Voeg `@t3-oss/env-nextjs` (frontends) + `@t3-oss/env-core`/`nestjs-zod` (api) toe met per-app compositie. Grootste DX-gat.
- [ ] **Git hooks + conventional commits** — geen `.husky/`. Husky + lint-staged (root) + commitlint.
- [ ] **CI/CD** — geen `.github/`. GitHub Actions: lint/test/build met Turborepo remote caching + deploy hook naar Coolify.
- [ ] **Dependency updates** — Renovate (of Dependabot) `renovate.json`.
- [ ] **Release/versioning** — changesets (monorepo-standaard) voor de gedeelde packages.
- [ ] **`turbo gen` generators concreet maken** — `@turbo/gen` staat er al; voeg templates toe (nieuw package, nieuwe NestJS-module, nieuwe UI-component) zodat "one-command scaffold" werkt.
- [ ] **`.env.example` uitbreiden** + één setup-commando (clone → `pnpm setup` → alles draait). Benchmark uit research.
- [ ] (Optioneel) **Biome** overwegen i.p.v. ESLint+Prettier voor snelheid — of bewust bij ESLint blijven; documenteer de keuze.

## Tier 2 — API-hardening

- [ ] **Zod voor gedeelde schema's** — `nestjs-zod` voor env + schema's die client/server delen; class-validator aan de DTO-rand houden.
- [ ] **Throttler → Redis storage** — `@nestjs/throttler` staat op in-memory; wissel naar Redis-storage zodat rate limiting werkt over meerdere instances.
- [ ] **Bull Board** — `@bull-board/nestjs` queue-dashboard (retry/inspect); nu geen dashboard. Voeg auth-gating + DLQ-policy + exponential backoff toe.
- [ ] **Single cron scheduler** — bij multi-instance BullMQ voorkomen dat repeatable/cron jobs N× draaien.
- [ ] **Idempotency keys** — voor billing/webhook-endpoints.

## Tier 3 — B2B-kern (organisaties, RBAC, auth-extra's)

- [ ] **Beslissing vooraf: tenancy-model** — many-to-many via `Membership` (jointable met role-kolom). Bevestigd door de eis "user maakt org + nodigt anderen uit": meerdere users per org, en een user kan bij meerdere orgs horen. Bepaalt het schema, dus eerst vastleggen.
- [ ] **Twee orthogonale rol-dimensies** (belangrijk om niet te mengen):
  - **Org-rol** (`Membership.role`: owner/admin/member) — scope't *binnen één org*: mag ik in mijn org uitnodigen/beheren?
  - **Platform-rol** (`User.systemRole`: `USER`/`SUPER_ADMIN`) — scope't *over het hele platform*: mag ik de manager-app in? (zie Tier 3b)
- [ ] **In-org rollen** — minstens **owner/admin** (mag uitnodigen + org beheren) vs **member**. Self-service RBAC binnen een org.
- [ ] **Organisatie-CRUD in de backend** (concrete eerste stap van deze tier) — Prisma-schema heeft nu alleen `User`/`RefreshToken`/`ActivationCode`/`EmailChangeRequest`/`File`. Voeg toe:
  - `Organization` + `Membership` (role-kolom) + `Invitation` (email + token, status) modellen; scope elke query op `organizationId`.
  - Nieuwe `organizations` NestJS-module met CRUD-endpoints (create/read/update/delete + members + invites).
  - **Surface 1 — self-service (user)**: user maakt zijn eigen org aan (creator wordt owner) én kan anderen **uitnodigen** in díe org (owner/admin-rol vereist).
  - **Surface 2 — manager**: back-office CRUD over álle orgs (zie Tier 3b) — zelfde endpoints, andere autorisatie (manager/admin-rol).
- [ ] **Invite-flow (user-facing)** — owner/admin nodigt via email + token uit → uitgenodigde accepteert → wordt member. Pending/accepted/expired status; her-uitnodigen. Dit is een gebruikers-feature, niet manager-only.
- [ ] **Workspace-switching** — org-switcher in de frontends (user kan bij meerdere orgs horen).
- [ ] **Authorization (RBAC → ABAC)** — NestJS guards + `@Roles()` als grove laag; **CASL** (`@casl/prisma`) voor row-level checks. Nu geen rollen aanwezig.
- [ ] **Auth-extra's, incrementeel**: social OAuth (Google/GitHub) → magic links → TOTP 2FA → (enterprise-tier) SAML SSO + SCIM via BoxyHQ SAML Jackson.
- [ ] **Audit logs** — vroeg toevoegen (pijnlijk om te retrofitten). Table-based of Retraced-stijl.
- [ ] **Admin-impersonation** — met safeguards (geen admins/banned users) + verplicht audit-loggen.

## Tier 3b — Manager (back-office) — is de bestaande `dashboard` app

> De **`dashboard` app is de manager/back-office app** (heeft al `@repo/auth`, `@repo/i18n`, `@repo/queries`). Geen nieuwe app nodig — deze features erin bouwen. Bouwt op de org/RBAC-laag uit Tier 3.
> Research-referentie: "Admin / back-office tooling" — role-gated route of AdminJS (Prisma + NestJS adapters).

- [ ] **Super-admin platform-rol** — `User.systemRole = SUPER_ADMIN`. Een super admin heeft toegang tot de **gewone app** (heeft ook normale org-memberships) **én** tot de **manager**. Dit is de platform-rol uit Tier 3, losstaand van org-rollen.
- [ ] **Bootstrap eerste super admin** — kip-ei: wie maakt de eerste? Los op via **seed-script / env-driven bootstrap** (bv. `SUPER_ADMIN_EMAIL` bij eerste start). Daarna kunnen super admins vanuit de manager-app nieuwe super admins aanmaken.
- [ ] **Toegang gate'n** — manager-routes in `dashboard` alleen toegankelijk voor `SUPER_ADMIN` (NestJS guard op de endpoints + route-guard in de frontend + audit-log).
- [ ] **User management** — users kunnen **disablen, deleten, activeren** en **wachtwoord resetten/wijzigen** vanuit het dashboard.
- [ ] **Manager-user aanmaken** — nieuwe gebruiker aanmaken/uitnodigen mét `SUPER_ADMIN`-rol (toegang tot app + manager).
- [ ] **Organisaties managen** — vanuit het dashboard alle organisaties bekijken/aanmaken/bewerken/(de)activeren/verwijderen (gebruikt de `organizations`-endpoints uit Tier 3, met admin-autorisatie).
- [ ] (Volgt logisch) manager-acties koppelen aan **audit logs** + eventueel **impersonation** (zie Tier 3).

## Tier 4 — Operationele plumbing

- [ ] **Error tracking** — geen Sentry/GlitchTip. **GlitchTip** (Sentry-SDK-compatibel, self-host op Coolify, ~256–512 MB) is de Coolify-vriendelijke keuze. Logging (Pino) is al aanwezig ✅.
- [ ] **OpenTelemetry tracing/metrics** (optioneel) — OTel → Grafana/Tempo/Prometheus of Uptrace.
- [ ] **In-app notifications** — DB-backed notification table als start; **Novu** (self-host) voor multi-channel + `<Inbox />` later.
- [ ] **Uitgaande customer-webhooks** — Svix-patroon (signing, retries, replay) als je klant-events aanbiedt.
- [ ] **DB-extra's** — seed-scripts, soft deletes (`deletedAt`, let op unique constraints), audit-kolommen (`createdBy`), connection pooling (PgBouncer/pooler).

## Tier 5 — Monetization & growth

- [ ] **Billing-laag over Stripe** — webhook → subscription-state flow, provider-abstractie zodat een merchant-of-record (Polar/Paddle/Lemon Squeezy of Stripe Managed Payments) inwisselbaar is.
- [ ] **Feature flags** — self-host Flagsmith of Flipt (single binary, simpelste ops), of PostHog-gebundeld. Voeg stale-flag opschoon-discipline toe.
- [ ] **Analytics** — PostHog (product) of Plausible/Umami (privacy-vriendelijk web, self-host, Coolify).
- [ ] **Search** — start Postgres FTS (`pg_trgm`); graduate naar self-hosted Meilisearch/Typesense bij search-as-you-type/faceting.

## Tier 6 — Frontend / marketing / polish

### Token-based design system + "Claude design"-loading

> **Doel**: globaal tokensysteem zodat je design systems (o.a. via **Claude design** / de `import-claude-design-from-url` MCP-tool) kunt inladen en alles netjes doorwerkt in alle apps.
>
> **Huidige staat** (`packages/ui/src/styles/globals.css`): standaard shadcn/ui + Tailwind v4 tokenlaag — `:root` + `.dark` met `oklch`-tokens (`background`/`foreground`/`primary`/`secondary`/`muted`/`accent`/`destructive`/`border`/`input`/`ring`/`radius`/`chart-1..5`) + `@theme inline` dat ze naar Tailwind-utilities mapt. **Dit is exact het formaat dat Claude design uitspuugt** — het contract klopt al; het ontbreekt aan multi-theme, import-workflow, toggle en typed export.

- [ ] **Token-contract vastleggen** — documenteer de verplichte set token-namen (de shadcn CSS-variabelen die er al staan) als het "contract". Elk ingeladen design systeem dat dit contract vult, werkt automatisch. Basis voor alles hieronder.
- [ ] **Multi-theme / swappable themes** — van één hardcoded `:root` naar meerdere benoemde themes (bv. `[data-theme="..."]`-blokken of per-theme CSS-bestanden die het contract vullen). Eén actieve theme selecteerbaar per app.
- [ ] **Claude-design import-workflow** — script/generator (`turbo gen theme`) dat een Claude-design (via `import-claude-design-from-url` of geplakte `globals.css`) inleest, de variabelen op het token-contract mapt, en **valideert dat alle vereiste tokens gevuld zijn** (waarschuwt bij ontbrekende). Zo "werkt alles netjes" na import.
- [ ] **Typed TS-tokens** — expose de tokens ook als getypte TS-export vanuit `@repo/ui` (bv. `tokens.ts`), zodat niet-CSS consumers (charts, JS-logica) uit dezelfde single source of truth lezen.
- [ ] **Dark mode wiren** — `.dark` bestaat al maar niets schakelt 'm: `next-themes` toevoegen aan de frontends + een theme-toggle. Werkt samen met multi-theme (light/dark per theme).
- [ ] **Storybook** — voor de bestaande `packages/ui` (nu geen Storybook); toont de tokens + componenten per theme, zodat een ingeladen design system visueel te reviewen is.
- [ ] (Optioneel) **Design-token bronformaat** — overweeg tokens in een neutraal bronformaat (bv. W3C Design Tokens JSON) met een build-stap naar CSS-variabelen, als je tokens uit meerdere tools wilt kunnen voeden. Alleen als je verder gaat dan Claude design.
- [ ] **SEO** — geen `sitemap.ts`/`robots.ts` gevonden. Next Metadata API, dynamische OG-images (`@vercel/og`/Satori), JSON-LD. Alleen op `website`; `dashboard`/`web` `noindex`.
- [ ] **Onboarding-flow** — resumable wizard (workspace → team invite → integraties), state op user/org.
- [ ] **Legal** — terms/privacy/cookie-policy pagina's + cookie-consent banner die analytics gate't; GDPR export/delete endpoints.
- [ ] **Marketing/blog** — hero/pricing/FAQ componenten; blog via MDX + Velite (Contentlayer is dood) of Content Collections.
- [ ] **Docs-site** — nu alleen losse markdown in `docs/`. Starlight of Fumadocs (self-host) — of Mintlify (hosted) voor API-playground.
- [ ] **Changelog & status page** — self-host Uptime Kuma/OneUptime, gekoppeld aan uptime-monitoring.

## Tier 7 — Nice-to-have

- [ ] **API key management** voor customer-facing API's (Unkey).
- [ ] **AI-features** — Vercel AI SDK integratiepunt.
- [ ] **PWA/offline**, link-shortening (Dub) — alleen indien relevant.

---

### Aanpak-principes (uit research)

- **Menu, geen checklist.** Kies per categorie één optie, wire 'm diep, documenteer goed — liever dan overal een ondiepe integratie.
- **Self-host bias** past bij Coolify: GlitchTip (Sentry), Novu (notifications), Flagsmith/Flipt (flags), Meilisearch/Typesense (search), MinIO (storage), Plausible/Umami (analytics), Bull Board (queues).
- **Volgorde volgt leverage**: eerst DX-fundament (Tier 1), dan pas features — dat maakt de template adopteerbaar.
- **Herverifiëren vóór commit**: Better Auth, Unleash OSS-editie, oRPC v1.0, Stripe Managed Payments zijn bewegende doelen.
