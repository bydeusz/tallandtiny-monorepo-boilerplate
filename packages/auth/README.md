# @repo/auth

Shared authentication for the monorepo: React context, server route-handlers +
middleware, and the auth UI (forms + field primitives). Ship raw TSX — the
consuming Next app transpiles it via `transpilePackages`.

## Entries

| Import | Contents |
|---|---|
| `@repo/auth` | `AuthProvider`, `useAuth`, `QueryProvider` (client) |
| `@repo/auth/server` | `loginHandler`, `refreshHandler`, `logoutHandler`, `createAuthMiddleware` |
| `@repo/auth/components` | `LoginForm`, `RegisterForm`, `RegisterConfirmForm`, `ResetPasswordForm`, `VerifyEmailForm`, `PasswordForm`, `TextField`, `PasswordField`, `OtpField` |

## Wiring a new app

1. **Dependency + transpile.** Add `"@repo/auth": "workspace:*"` to the app and
   include `@repo/auth` in `transpilePackages` in `next.config.ts`. Provide the
   peer deps: `next`, `next-intl`, `react`, `react-dom`, `@tanstack/react-query`.

2. **Providers.** Wrap the app in `QueryProvider` + `AuthProvider` from `@repo/auth`
   (and a `NextIntlClientProvider` — see i18n below).

3. **UI.** Render the forms from `@repo/auth/components` inside thin `(auth)`
   page wrappers plus an `(auth)/layout.tsx`, e.g.:

   ```tsx
   import { LoginForm } from "@repo/auth/components";
   export default function LoginPage() {
     return <LoginForm />;
   }
   ```

4. **Server.** Re-export the handlers as route handlers and use the middleware:

   ```ts
   // app/api/auth/login/route.ts
   export { loginHandler as POST } from "@repo/auth/server";
   // proxy.ts
   import { createAuthMiddleware } from "@repo/auth/server";
   ```

5. **i18n (required).** The forms call `useTranslations("auth.*")` and the field
   primitives call `useTranslations("inputs.errors")`. Load the `auth.*` and
   `inputs.errors` namespaces from `@repo/i18n` via `next-intl`. Missing namespaces
   surface as missing-key warnings.

## Configurable links

The forms are UI-only and route via next `<Link>`. Link targets are optional props
so each app can differ without forking the component:

- `LoginForm`: `showRegister` (default `true`), `registerHref` (default `/register`),
  `resetHref` (default `/reset-password`).
- `RegisterForm` / `ResetPasswordForm` / `VerifyEmailForm`: `loginHref` (default `/login`).

Example — a closed app with no self-registration:

```tsx
<LoginForm showRegister={false} />
```
