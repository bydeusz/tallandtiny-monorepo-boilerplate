# apps/dashboard Port — Phased Overview (Plan 5/5)

**Goal:** Port the `nextjs-dashboard-boilerplate` app into `apps/dashboard`, consuming the shared packages built in Plans 1–4 (`@repo/queries`, `@repo/ui`, `@repo/i18n`, `@repo/auth`).

**Status:** Phased plan. Each phase is authored just-in-time as its own bite-sized plan and executed via subagent-driven-development, so each phase's plan sees the exact interfaces the prior phase produced.

## Cross-cutting decisions

- **API origin (no rewrite):** the monorepo `@repo/queries` mutator has `baseURL = NEXT_PUBLIC_API_URL` and calls the NestJS API **directly** (cross-origin, Bearer auth — no cookies on data calls). This differs from the boilerplate (no-baseURL + same-origin `/api/v1` rewrite). So the dashboard does **not** add a rewrite; both the client mutator and the BFF handlers (`@repo/auth/server`) use `NEXT_PUBLIC_API_URL` (`http://localhost:3001`). **Runtime prerequisite:** the API's CORS `cors.origins` must include the dashboard origin `http://localhost:3002` (config-driven in `apps/api`). The httpOnly `refresh_token` cookie stays same-origin (set by, and read by, the dashboard's own `/api/auth/*` BFF routes).
- **Forms — Field wrapper:** the boilerplate's smart `InputField`/`Password`/etc. (built-in validation + next-intl error text) were intentionally NOT moved to `@repo/ui` (which has dumb token primitives). Phase B builds a thin **app-level `Field`** layer (`apps/dashboard/src/components/forms/field.tsx` + friends) that pairs `@repo/ui` `Label`/`Input`/etc. with validation + `useTranslations("inputs.errors")` messages, replicating the boilerplate behavior. Feature forms consume that Field layer.
- **Token-normalization:** ported app-shell + feature components use `@repo/ui` primitives and semantic token classes only — no hardcoded palette colors (same rule as the packages).
- **Verification model:** the hard gate for every phase is `pnpm --filter dashboard check-types` + `pnpm --filter dashboard build` (catches type errors, import resolution, RSC/client boundaries, missing translation namespaces, token/class issues). True end-to-end (logging in against a live API + Postgres + MinIO) is **best-effort** — run via the stack if available, otherwise it is the human's manual verification step. Phases do not block on a live backend.
- **Assets:** images (`/img/mood-bg.jpg`, `/img/logo.jpg`, avatars) are copied from the boilerplate `public/` into `apps/dashboard/public/` in the phase that first renders them. The toast system is sound-free, so no audio asset is needed.

## Phases

| Phase | Scope | Key deliverables | Gate |
|---|---|---|---|
| **A — Wiring** | App integration of the shared packages | deps (`@repo/auth`,`@repo/i18n`,`next-intl`,`flag-icons`,`lucide-react`); `next.config` (next-intl plugin + images + transpile); `src/i18n/request.ts`; root `layout.tsx` (provider composition + `NextIntlClientProvider` + font); `middleware.ts`; `app/api/auth/*` + `app/api/language` re-exports; `globals.css` `@source` | check-types + **build** |
| **B — Auth surface** | Login/register/reset/verify | `(auth)` layout (token); app `Field` form layer; `LoginForm`, `RegisterForm`, `RegisterConfirm`, `ResetPassword`, `PasswordForm`, `VerifyEmail`; pages login / register(+confirm) / reset-password(+confirm) / verify; `/img/mood-bg.jpg` | check-types + build (+ best-effort login) |
| **C — Dashboard shell** | Authenticated shell + home | `(dashboard)` layout; `Dashboard`/`Header`/`DashboardLinks`/`Brand`/`LogoutButton`/`Thumbnail`; home page; `/img/logo.jpg` | check-types + build |
| **D — Organisation** | Org management | organisation pages (page/new/team/branding/layout); `organisation/*` dialogs + `UpdateOrganisation(Branding)`/`OrganisationLogoUpload`; `Lists/TeamList`; `cards/LinkedCard`; `CreateOrganisationForm`; `useRoles` | check-types + build |
| **E — Settings + user** | Account management | settings pages (page/account/delete/subscription/layout); `user/*` (`UpdateUser`/`UpdateAvatar`/`ChangeEmail`/`UpdatePassword`/`DeleteUser`/`UpdateUserBillingDetails`) | check-types + build |
| **F — Support + final** | Support + end-to-end | support page; `ContactForm`; full build; best-effort end-to-end pass; backlog sweep (Plan-4 deferred items, lucide dedup, turbo `test` task) | check-types + build (+ best-effort e2e) |

## Dependencies between phases

A → (B, C) → (D, E) → F. Phase A must land first (everything imports the wiring). B and C are independent after A. D and E depend on C (the shell). F is last.

## Out of scope (this plan)

- Changes to the shared packages beyond their published APIs (any gap found becomes a small, reviewed amendment to the relevant package, noted in the ledger).
- New backend/API features. (CORS origin for `:3002` is a config value, not a code change — flagged as a runtime prerequisite.)
