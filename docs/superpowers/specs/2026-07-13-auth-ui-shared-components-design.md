# Auth-UI shared components in `@repo/auth` — design

**Date:** 2026-07-13
**Status:** Approved (brainstorm) — ready for implementation plan
**Topic:** Move the auth form components + field primitives out of `apps/dashboard` into a reusable `@repo/auth/components` entry, so a new app needs only thin page/route wrappers.
**Trello:** [Ticket #2 — Auth-UI delen als herbruikbare componenten in `@repo/auth`](https://trello.com/c/3jEsNC6g) (blue = story)

## Goal

The auth **logic** is already shared in `@repo/auth` (`AuthProvider`/`useAuth` via `.`, server handlers + middleware via `./server`). The **UI layer** is not: the forms and field primitives live only in `apps/dashboard/src/components/forms/`. This story moves that UI into a new `@repo/auth/components` entry so any app (web-app in #9, dashboard in #10) can consume the same forms via thin wrappers instead of copying them. `@repo/ui` stays a pure, app-agnostic design system.

This is primarily a **move + rewire** refactor. The one piece of genuinely new behaviour is making the hardcoded navigation links on the shared forms configurable via props.

## Decisions (locked during brainstorm)

| Decision | Choice |
|---|---|
| Where the UI lives | **`@repo/auth`** (not `@repo/ui`) — forms are connected components; primitives depend on `next-intl`, which `@repo/ui` may not. |
| Entry shape | **Single new subpath `@repo/auth/components`** exporting forms **and** primitives. (Considered a separate `@repo/auth/fields`; rejected for simplicity.) |
| Packaging | **No bundler** — ship raw `.tsx` via the `exports` map, transpiled by the consuming Next app (`transpilePackages`). Mirrors `@repo/ui` / `@repo/i18n`. |
| Hardcoded links | **Configurable props now**, defaults = current dashboard behaviour. Front-loads what #9/#10 need so they don't re-touch the shared form. |
| `otp-field.tsx` | **Moves too** (only `VerifyEmailForm` uses it; the ticket didn't list it explicitly). |
| Field primitives' non-auth consumers | The 6 non-auth dashboard components + `contact-form.tsx` that use `TextField`/`PasswordField` are **rewired to `@repo/auth/components`** (forced by deleting the dashboard copies). |
| Test level | **Render-smoke per form + targeted prop tests** on `LoginForm`. Switch `@repo/auth` vitest to the `react()`/jsdom preset. E2E stays with `/project:test-ticket` (Playwright). |
| `@repo/i18n` messages | **No relocation** — `auth.*` + `inputs.errors` already live there and are loaded by the host app. |

## Current state (why this is cheap)

- **No build step anywhere.** `apps/dashboard/next.config.ts` already lists `@repo/auth` in `transpilePackages`, so a new `./components` subpath needs no config change. Each form already has `"use client"`.
- `packages/auth/package.json` exports only `.` (client barrel) and `./server`; both point at raw `.ts`. No `main`/`module`/`types`/`files`.
- The forms already depend on shared building blocks (`useAuth` from `@repo/auth`, `Button`/`Alert` from `@repo/ui`, `@repo/queries` hooks, `next-intl`), but on a **local** field import (`@/components/forms/text-field`).
- `@repo/i18n` is the template for a package that ships a client component (`LanguageSwitcher`) alongside other entries via a multi-entry `exports` map + peer deps.
- `packages/auth` currently runs the `node()` vitest preset with a single `server.test.ts`; there are **no** component tests. `apps/dashboard` has **no** test setup at all.

## Architecture

### New package layout (`packages/auth/src/components/`)

Each file keeps `"use client"`. Forms import the primitives **relatively** (`./text-field`), never `@/components/forms/*`.

```
packages/auth/src/components/
  index.ts                  # barrel — public API of ./components
  login-form.tsx            # LoginForm
  register-form.tsx         # RegisterForm
  register-confirm-form.tsx # RegisterConfirmForm
  reset-password-form.tsx   # ResetPasswordForm
  verify-email-form.tsx     # VerifyEmailForm
  password-form.tsx         # PasswordForm
  text-field.tsx            # TextField   (primitive)
  password-field.tsx        # PasswordField (primitive)
  otp-field.tsx             # OtpField     (primitive, used by VerifyEmailForm)
  __tests__/                # render-smoke + prop tests (see Testing)
```

`index.ts` exports (all named): `LoginForm, RegisterForm, RegisterConfirmForm, ResetPasswordForm, VerifyEmailForm, PasswordForm, TextField, PasswordField, OtpField`.

### `packages/auth/package.json`

- `exports` += `"./components": "./src/components/index.ts"` (keep `.` and `./server`).
- `dependencies` += `"@repo/ui": "workspace:*"` and **move** `"lucide-react"` from `devDependencies` into `dependencies` (it is a runtime import of the forms/primitives, not dev-only). `@repo/queries` is already a dependency.
- `peerDependencies` unchanged: `next`, `next-intl`, `react`, `react-dom`, `@tanstack/react-query` already declared (a peer's `devDependencies` entry stays for isolated type-check/tests).
- `devDependencies` += `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (as in `@repo/ui`).

### New behaviour — configurable link props

Hardcoded `<Link>`s on the forms become props. **Defaults reproduce today's dashboard behaviour**, so the dashboard pages pass nothing and behave identically.

| Component | New props (with defaults) |
|---|---|
| `LoginForm` | `showRegister?: boolean = true`, `registerHref?: string = "/register"`, `resetHref?: string = "/reset-password"` |
| `RegisterForm` | `loginHref?: string = "/login"` |
| `ResetPasswordForm` | `loginHref?: string = "/login"` |
| `VerifyEmailForm` | `loginHref?: string = "/login"` (keeps existing `email: string`) |

- `register-confirm-form.tsx` / `password-form.tsx` navigate via `router.push` (Buttons, not `<Link>`); their existing behaviour is preserved. If a post-login/redirect target turns out to be hardcoded, it becomes an `href`-style prop defaulting to the current value — **no behaviour change in this story** (the web-app's own destination is set in #9).
- Links continue to use next `<Link>` — the components stay UI-only and config-free in the "no build/app config" sense; a boolean/href prop does not change that.

### Consuming the components — dashboard rewire

- `apps/dashboard/src/app/(auth)/**/page.tsx`: swap imports from `@/components/forms/<x>` to `@repo/auth/components`. `login/page.tsx` needs no new props (register link stays visible via the default). `verify` and `reset-password/confirm` keep passing their `email` prop.
- **Field-primitive consumers** — update these dashboard files to import `TextField`/`PasswordField` from `@repo/auth/components` (they currently import `@/components/forms/*`):
  - `apps/dashboard/src/components/forms/contact-form.tsx` (stays a dashboard file; only the import path changes)
  - `apps/dashboard/src/components/user/change-email.tsx`
  - `apps/dashboard/src/components/user/delete-user.tsx`
  - `apps/dashboard/src/components/user/update-password.tsx`
  - `apps/dashboard/src/components/user/update-user.tsx`
  - `apps/dashboard/src/components/user/update-user-billing-details.tsx`
- **Delete** from `apps/dashboard/src/components/forms/`: the 6 auth forms (`login-form`, `register-form`, `register-confirm-form`, `reset-password-form`, `verify-email-form`, `password-form`) + the 3 primitives (`text-field`, `password-field`, `otp-field`). `contact-form.tsx` remains.
- `apps/dashboard/package.json` already depends on `@repo/auth` and `@repo/ui`; `next.config.ts` `transpilePackages` already includes `@repo/auth` — no changes needed.

### i18n

- No message relocation. The moved forms keep calling `useTranslations("auth.login" | "auth.register" | "auth.reset" | "auth.verify")` and the primitives call `useTranslations("inputs.errors")`. Namespaces resolve from the **host app's** next-intl provider.
- Confirmed present in `packages/i18n/src/messages/{nl,en}.json`: `auth.{login,register,reset,verify}` and `inputs.errors.{email,required,tel,url}`.
- A consuming app must load these namespaces via next-intl and include `@repo/i18n` — documented in the README below.

### `@repo/ui` stays pure

Nothing is added to `@repo/ui`; no new dependency on `@repo/auth`/`next-intl`. `packages/ui/scripts/check-structure.mjs` is scoped to `packages/ui/src` and continues to pass unchanged.

## Testing

- **Preset switch:** `packages/auth/vitest.config.ts` moves from `node()` to `react()` (jsdom). The existing `packages/auth/src/server.test.ts` gets a `// @vitest-environment node` docblock so the Next server-handler tests keep running under node.
- **New tests** in `packages/auth/src/components/__tests__/`:
  - Per form (`login`, `register`, `register-confirm`, `reset-password`, `verify-email`, `password`): a render-smoke test asserting the form renders and its key fields/labels are present.
  - `LoginForm` targeted prop tests (written first — TDD): `showRegister={false}` hides the register link; `registerHref` overrides the link target; default shows `/register`.
- **Verification order:** `turbo run check-types` and `turbo run test` pass for `@repo/auth` and the dashboard. Because `apps/dashboard` has no test suite, its `test` is a no-op; type-check is the real dashboard gate. End-to-end verification of the `(auth)` flows runs via `/project:test-ticket` (Playwright).

## README (`packages/auth/README.md`)

New doc describing how to wire auth into an app:
1. Providers: `AuthProvider` + `QueryProvider` from `@repo/auth` (`.`).
2. UI: render forms from `@repo/auth/components` inside thin `(auth)` page/route wrappers + an `(auth)/layout.tsx`.
3. Server: route handlers (`loginHandler`/`refreshHandler`/`logoutHandler`) + `createAuthMiddleware` from `@repo/auth/server`.
4. i18n: provide the `auth.*` and `inputs.errors` namespaces via `@repo/i18n` and next-intl.
5. Required peer deps (`next`, `next-intl`, `react`, `react-dom`, `@tanstack/react-query`) and adding `@repo/auth` to the app's `transpilePackages`.
6. The configurable link props (`showRegister`/`registerHref`/`resetHref`/`loginHref`).

## Acceptance criteria mapping

- [ ] `@repo/auth` exports the forms via `@repo/auth/components`, separate from `.` and `./server`. → *package.json exports + `src/components/index.ts`*
- [ ] `TextField`/`PasswordField` moved into `@repo/auth`; forms use them; no `@/components/forms/*` imports in the forms. → *relative imports in `src/components/`*
- [ ] `@repo/ui` stays pure; no auth forms, no `@repo/auth`/`next-intl` dep; structure test still passes. → *`@repo/ui` untouched*
- [ ] Dashboard uses the shared components; duplicated form files in `apps/dashboard/src/components/forms/` are removed. → *rewire + delete*
- [ ] Dashboard `(auth)` pages still work and render the shared forms. → *page-wrapper import swap*
- [ ] `packages/auth/package.json` declares the UI (peer)deps (`@repo/ui`, `lucide-react`, `next-intl`, `next`, `react`). → *deps update*
- [ ] i18n namespaces (`auth.*`, `inputs.errors`) available via `@repo/i18n` and documented. → *README + no message move*
- [ ] Components stay UI-only and config-free (routing via next). → *link props default to current behaviour, next `<Link>`*
- [ ] `turbo run check-types` and `turbo run test` pass for `@repo/auth` and the dashboard. → *Testing section*
- [ ] Short README in `packages/auth` explains wiring auth UI + logic into a new app. → *README section*

## Extra scope surfaced during brainstorm (not in the ticket text, but required)

- `otp-field.tsx` must move with `VerifyEmailForm`.
- The 6 non-auth dashboard components + `contact-form.tsx` must be rewired to `@repo/auth/components` because their `TextField`/`PasswordField` source is being deleted from the dashboard.

## Out of scope (YAGNI / other tickets)

- Removing the dashboard register/verify **routes** — that is #10 (Story A).
- Building the web-app auth flow — that is #9 (Story B); this story only provides the shared components + link props it will consume.
- Splitting primitives into a separate `@repo/auth/fields` entry — considered and deferred; a single `./components` entry is used.
- Any backend change (`/auth/*` endpoints unchanged).

## Risks / notes

- **`server.test.ts` under jsdom:** mitigated by pinning it to `@vitest-environment node`. Verify the server tests stay green after the preset switch.
- **"auth" naming smell:** non-auth dashboard forms importing `TextField` from `@repo/auth/components` is a minor architectural oddity, accepted per the ticket's deliberate package choice (primitives depend on `next-intl`, so they can't live in pure `@repo/ui`). A future `@repo/auth/fields` split remains an easy refactor.
- **Post-login redirect:** confirm during implementation whether login's post-success destination is hardcoded; if so, expose it as an `href` prop defaulting to the current value — no behaviour change here.
