# Dashboard boilerplate port — design

**Date:** 2026-06-24
**Status:** Approved (pending implementation plan)
**Scope:** Full 1:1 port of `nextjs-dashboard-boilerplate` into `apps/dashboard`, extracting generic concerns into shared packages.

## Goal

Port the standalone `nextjs-dashboard-boilerplate` (Next 16, React 19, Tailwind v4,
next-intl, TanStack Query, orval/axios, Radix) into the monorepo's `apps/dashboard`,
while extracting everything that is genuinely generic into shared packages so all apps
can reuse it. The boilerplate's app-specific features (auth pages, dashboard shell,
organisation/settings/support, user management) land in `apps/dashboard`.

## Decisions (locked)

1. **Scope:** Full 1:1 port in one trajectory (all pages/features), sharing generic
   parts along the way.
2. **Auth/API:** Keep the boilerplate's BFF auth pattern (Next `/api/auth/*` routes,
   httpOnly `refresh_token` cookie, in-memory access token, refresh-on-401) and
   **extend `@repo/queries`** with a pluggable 401→refresh interceptor + token store,
   rather than duplicating an axios client.
3. **i18n:** Stand up a shared `@repo/i18n` layer now (next-intl infra + `en`/`nl`
   translations + locale switcher), not app-local.
4. **UI style:** Move generic primitives into `@repo/ui` **normalized to the design
   tokens** (oklch CSS variables, dark-mode) and **i18n-free** (validation/messages via
   props or the app/form layer), not as-is with hardcoded colours + next-intl.
5. **Providers package:** A single new `@repo/auth` package holds the session runtime
   (`QueryProvider` + `AuthProvider` + `OrganisationProvider` + org helpers + BFF server
   handlers). Apps compose providers in their own `providers.tsx`.

## Current state (baseline)

- **Monorepo:** Turborepo + pnpm. `apps/`: `api` (NestJS), `web` (:3000), `dashboard`
  (:3002, near-empty scaffold), `website`. `packages/`: `database` (Prisma),
  `eslint-config`, `queries`, `typescript-config`, `ui`.
- **`@repo/queries`:** orval-generated client for the NestJS API (auth, users,
  organisations, files, mail, health) + a pluggable axios mutator
  (`setAuthTokenGetter`, `baseURL = NEXT_PUBLIC_API_URL`, response-unwrap of
  `{ success, data, ... }`). **No** refresh-on-401 logic. Replaces the boilerplate's
  `src/generated/api` + `src/lib/axios.ts`.
- **`@repo/ui`:** shadcn "new-york", **lowercase** token-based primitives (`button`,
  `card`, `dialog`, `input` only), Tailwind v4 `globals.css` with full light/dark token
  set, `cn` util. Exports `./components/*`, `./lib/*`, `./globals.css`. Apps scan it via
  `@source`.
- **Apps:** thin `Providers` (only `QueryClient`, no devtools/defaults).
- **Boilerplate:** BFF routes use only `NEXT_PUBLIC_API_URL` + cookies (self-contained).
  Generated client calls same-origin `/api/v1/*` via a Next rewrite. next-intl uses a
  `NEXT_LOCALE` cookie + `en`/`nl` JSON (~400 lines each; keys: auth, navigation,
  banners, forms, modals, tables, pages, common, inputs).

## Target architecture — the shared boundary

### Shared (`packages/`)

| Package | Contents | Depends on |
|---|---|---|
| **`@repo/ui`** *(extend)* | All token primitives (Accordion, AspectRatio, Card, Carousel, Sheet, Skeleton, Table, Alert, Dialog, Drawer, Popover, Tooltip, Tabs, Breadcrumbs, Avatar, Badge, Button, NavLink, inputs: Input/Password/Select/Checkbox/Radio/Slider/TextArea/Toggle/Search/Dropdown). **Toast system** (Toast + `useToast` + `Toaster`). Generic hooks (`useClickOutside`, `useDateFormatter`). New exports: `./components/ui/*`, `./hooks/*`. | pure UI; **no** data/i18n |
| **`@repo/queries`** *(extend)* | Generated client + mutator extended with **pluggable 401→refresh + token store**. Response helpers (`api-error`, `member-response`, `organisation-response`). | axios, tanstack (peer) |
| **`@repo/i18n`** *(new)* | next-intl request-config factory, locale constants (`en`,`nl`) + cookie helpers, `en`/`nl` messages, `LanguageSwitcher` + `useLocale`/`setLocale`, `/api/language` server handler. | next-intl, flag-icons |
| **`@repo/auth`** *(new)* | Session runtime: `QueryProvider` (rich: devtools + defaults), `AuthProvider`/`useAuth`, `OrganisationProvider`/`useOrganisation`, `useOrganisationOwnership`, `OrganisationSwitcher`, token-store wiring. `@repo/auth/server`: BFF handlers (login/refresh/logout) + middleware factory. | @repo/queries (+ @repo/ui for switcher) |

### App-local (`apps/dashboard`)

- **App shell:** `(auth)` + `(dashboard)` layouts, `Dashboard`, `Header`,
  `DashboardLinks`, `Brand`, `LogoutButton`.
- **Features:** `forms/*` (8), `organisation/*` (6), `user/*` (7), `cards/LinkedCard`,
  `Lists/TeamList`, `hooks/useRoles` (domain data).
- **Pages:** all `(auth)` (login, register +confirm, reset-password +confirm, verify) +
  `(dashboard)` (home, organisation +branding/new/team, settings
  account/delete/subscription, support).
- **Thin re-exports:** `app/api/auth/*` → `@repo/auth/server`; `app/api/language` →
  `@repo/i18n`; `middleware.ts` → `@repo/auth` factory; `providers.tsx` composes shared
  providers; root `layout.tsx`.
- **Assets:** `public/sounds/notification.mp3`, images.

**Principle:** `@repo/ui` stays pure (no data/i18n coupling) so token + dark-mode
coherence holds. Everything touching the shared NestJS API/session lives in
`@repo/auth`/`@repo/queries`. The app keeps only what is genuinely dashboard-specific.

## Port map (file → destination)

### → `@repo/ui` (token-normalized, i18n-free)
- Primitives: `actions/Button` *(merge into existing `button.tsx`)*, `actions/NavLink`;
  all `inputs/*`; `labels/Avatar`, `labels/Badge`; `layout/Accordion`, `AspectRatio`,
  `Card` *(merge)*, `Carousel`, `Sheet`, `Skeleton`, `Table`; all `messages/*` (Alert,
  `Dialog` *(merge)*, Drawer, Popover, Toast, Tooltip); `navigation/Breadcrumbs`, `Tabs`.
- Toast system: `messages/Toast` + `hooks/useToast` + `providers/ToastProvider`
  (→ `Toaster`).
- Generic hooks: `useClickOutside`, `useDateFormatter`.
- Validation/i18n text currently baked into `inputs/*` is removed; the shared `Input`
  becomes "dumb" (`value`/`onChange`/`error?`). The app gets a thin `Field` wrapper that
  supplies validation + translated error messages.

### → `@repo/queries`
- Extend mutator: pluggable **401→refresh interceptor** + token store (logic ported from
  boilerplate `lib/axios.ts` + `lib/auth-tokens.ts`), refresh endpoint configurable
  (default `/api/auth/refresh`), token setter injected at startup.
- Helpers: `api-error`, `member-response`, `organisation-response`.

### → `@repo/i18n` (new)
- `config/i18n.ts` → request-config factory; locale constants + cookie helpers;
  `public/translations/{en,nl}.json` → package; `actions/LanguageSwitcher` + `useLocale`;
  `app/api/language` → server handler.

### → `@repo/auth` (new)
- `providers/QueryProvider`, `providers/AuthProvider` (+`useAuth`),
  `providers/OrganisationProvider` (+`useOrganisation`).
- `ui/actions/OrganisationSwitcher`, `hooks/useOrganisationOwnership`.
- Token-store wiring (registers `setAuthTokenGetter` from `@repo/queries`).
- `@repo/auth/server`: BFF handlers `login`/`refresh`/`logout` + middleware factory
  (from `middleware.ts`).

### → `apps/dashboard` (app-local)
- Shell: `(auth)`/`(dashboard)` layouts, `layout/Dashboard`, `layout/Header`,
  `navigation/DashboardLinks`, `labels/Brand`, `actions/LogoutButton`.
- Features: `forms/*`, `organisation/*`, `user/*`, `cards/LinkedCard`, `Lists/TeamList`,
  `hooks/useRoles`.
- Pages: all `(auth)` + `(dashboard)` pages.
- Thin: `app/api/auth/*` + `app/api/language` (re-exports), `middleware.ts`,
  `providers.tsx`, root `layout.tsx`.
- Assets: `public/sounds/notification.mp3`, images.

**Consequence of token-normalization:** `forms/*` are ported but **adapted to the new
shared component APIs** (not byte-identical), since validation/i18n was lifted out of the
primitives. This is the largest piece of hand-work.

## Auth & data flow (BFF + shared mutator)

```
app providers.tsx (composition):
  QueryClientProvider → AuthProvider → OrganisationProvider → {children} + Toaster
```

1. **Boot:** `AuthProvider` registers once `setAuthTokenGetter(() => getAccessToken())`
   on the `@repo/queries` mutator, then calls `refreshSession()`.
2. **refreshSession:** `POST /api/auth/refresh` (same-origin BFF) → reads httpOnly
   `refresh_token` cookie → NestJS `/api/v1/auth/refresh` → sets new cookie, returns
   `access_token` → store in the in-memory token store → fetch current user via
   `@repo/queries`.
3. **Data calls:** flow through the mutator with `Bearer` from memory.
4. **401 handling (new, shared):** mutator interceptor performs **one** refresh against a
   configurable endpoint (default `/api/auth/refresh`), updates the token store, and
   retries the original request. If refresh fails → clear token + redirect `/login`.
   (Exactly the boilerplate `lib/axios.ts` logic, now pluggable in `@repo/queries`.)
5. **login/logout:** via BFF routes (set/clear cookie + NestJS call), then update token
   store + user / redirect.
6. **Middleware:** `@repo/auth` factory checks presence of the `refresh_token` cookie →
   redirect for auth/protected routes (matchers configurable per app).

**API origin:** for fidelity, adopt the boilerplate's same-origin `/api/v1/*` rewrite in
the dashboard `next.config` (no CORS; refresh + data both same-origin). `@repo/queries`
`baseURL` stays env-driven so other apps can go direct-to-API.

## i18n flow (`@repo/i18n`)

- next-intl plugin in `next.config` points to a config that calls the **factory from
  `@repo/i18n`** (reads `NEXT_LOCALE` cookie / `Accept-Language`, loads `en`/`nl` from the
  package).
- `LanguageSwitcher` (in `@repo/i18n`) → `POST /api/language` (re-export of the
  `@repo/i18n` handler) → sets `NEXT_LOCALE` cookie → `router.refresh()`.
- Translations live centrally in `@repo/i18n`; keys stay `auth/navigation/banners/forms/
  modals/tables/pages/common/inputs`.
- **Principle:** `@repo/ui` primitives never call `useTranslations`; the app/form layer
  supplies translated strings.

## Build order & verification

1. `@repo/queries`: mutator extension (refresh + token store) + helpers → **unit tests**
   (response unwrap, 401-refresh-retry, helpers).
2. `@repo/ui`: token-normalize primitives + toast system + hooks → type-check/build +
   render smoke.
3. `@repo/i18n`: factory + translations + `LanguageSwitcher` → type-check + locale switch.
4. `@repo/auth`: providers + `server` handlers + middleware factory → type-check.
5. `apps/dashboard`: `next.config` (next-intl + rewrite), `providers.tsx`,
   `middleware.ts`, `app/api/*` re-exports, root layout (globals already import
   `@repo/ui`).
6. **Port pages/features** in flow order: auth (login→register→reset→verify) →
   dashboard home → organisation → settings → support; adapt forms to the new component
   APIs.
7. **End-to-end:** run dashboard (`:3002`) against the running NestJS API (seeded) via
   `/run`: log in, navigate, locale switch, org switch, CRUD.

**Test strategy:** TDD where logic lives (mutator refresh, response helpers, `useToast`
reducer); `check-types` + `build` per package; run-based smoke for UI. (Per project
memory: frontend verification = type-check/build + running, not Jest-ESM.)

## Risks & mitigations

- **Overlapping primitives** (`button/card/dialog/input` already exist in `@repo/ui`):
  `@repo/ui` is canonical; fold in any needed variants and update consumers to the new
  API.
- **Forms lose baked-in validation/i18n:** a thin app-level `Field` wrapper replicates
  the validation rules + translated messages; risk of behaviour drift — mitigate by
  replicating the boilerplate's rules exactly.
- **Env/origin:** dashboard sets `NEXT_PUBLIC_API_URL` and the `/api/v1/*` rewrite
  correctly so refresh (cookie, same-origin) and data both work.
- **New peer deps in `@repo/ui`** (embla-carousel, vaul, more `@radix-ui/*`): add to the
  package's deps; keep `react`/`react-dom` as peers.

## Out of scope

- Replacing the BFF with direct-to-API auth.
- Promoting i18n config into `web`/`website` (those apps can adopt `@repo/i18n` later).
- Any redesign of the visual style beyond mapping hardcoded colours onto existing tokens.
