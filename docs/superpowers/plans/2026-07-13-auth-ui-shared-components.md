# Auth-UI Shared Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the dashboard's auth forms + field primitives into a new `@repo/auth/components` entry so any app can consume them via thin wrappers, and make the forms' navigation links configurable.

**Architecture:** No bundler — `@repo/auth` gains a third `exports` subpath (`./components`) pointing at raw `.tsx` source, transpiled by the consuming Next app (same pattern as `@repo/ui` / `@repo/i18n`). The forms move verbatim (behaviour-preserving) except that hardcoded `<Link>` targets become optional props whose defaults reproduce today's dashboard behaviour. `@repo/ui` is untouched and stays pure.

**Tech Stack:** Turborepo + pnpm workspaces, React 19, Next 16, next-intl 4, `@repo/ui` (shadcn atoms/molecules), `@repo/queries` (Orval hooks), Vitest via `@repo/vitest-config`, Testing Library.

## Global Constraints

Every task's requirements implicitly include this section.

- **No bundler / no build step.** Packages ship raw `.ts`/`.tsx` via the `exports` map; consuming apps list them in `transpilePackages`. `apps/dashboard/next.config.ts` already lists `@repo/auth` — do not change it.
- **`@repo/ui` stays pure.** Do NOT add auth forms to it, do NOT add a `@repo/auth`/`next-intl` dependency to it, and do NOT modify `packages/ui/scripts/check-structure.mjs`.
- **Behaviour-preserving move.** Do not change any component's public API or behaviour as a side effect. The ONLY new behaviour is the optional link props added in Task 2, whose defaults reproduce current behaviour exactly.
- **Client components.** Every moved file keeps its `"use client"` first line.
- **Exact versions (copy verbatim):** `react ^19.0.0`, `react-dom ^19.0.0`, `next ^16.0.0`, `next-intl ^4.8.3`, `lucide-react ^0.468.0`, `@repo/ui workspace:*`, `@testing-library/react ^16.3.2`, `@testing-library/user-event ^14.6.1`, `jsdom ^29.1.1`.
- **i18n.** Namespaces `auth.*` and `inputs.errors` already live in `@repo/i18n` — do NOT move or duplicate messages. Forms keep calling `useTranslations("auth.*")` / `useTranslations("inputs.errors")`.
- **Verification gates (run from the worktree root):** `turbo run check-types` and `turbo run test` must pass; `turbo run build --filter=dashboard` must build.
- **Commit** at the end of every task.

---

## File Structure

**New package (`packages/auth/src/components/`):**

| File | Responsibility |
|---|---|
| `index.ts` | Public barrel of `@repo/auth/components` — re-exports the 6 forms + 3 primitives |
| `login-form.tsx` | `LoginForm` (gains `showRegister`/`registerHref`/`resetHref`) |
| `register-form.tsx` | `RegisterForm` (gains `loginHref`) |
| `register-confirm-form.tsx` | `RegisterConfirmForm` |
| `reset-password-form.tsx` | `ResetPasswordForm` (gains `loginHref`) |
| `verify-email-form.tsx` | `VerifyEmailForm` (gains `loginHref`; keeps `email`) |
| `password-form.tsx` | `PasswordForm` (keeps `email`) |
| `text-field.tsx` | `TextField` primitive (unchanged) |
| `password-field.tsx` | `PasswordField` primitive (unchanged) |
| `otp-field.tsx` | `OtpField` primitive (unchanged) |
| `__tests__/*.test.tsx` | Render-smoke + link-prop tests |

**Modified config:** `packages/auth/package.json`, `packages/auth/vitest.config.ts`, `packages/auth/src/server.test.ts`.

**Modified consumers (dashboard):** the 6 `(auth)` pages, plus `contact-form.tsx` and 5 `user/*` components (import-path only).

**Deleted:** the 6 auth forms + 3 primitives under `apps/dashboard/src/components/forms/` (via `git mv`). `contact-form.tsx` stays.

---

## Task 1: Move auth-UI into `@repo/auth/components` (behaviour-preserving)

**Files:**
- Create: `packages/auth/src/components/index.ts`
- Move (`git mv`) → `packages/auth/src/components/`: `login-form.tsx`, `register-form.tsx`, `register-confirm-form.tsx`, `reset-password-form.tsx`, `verify-email-form.tsx`, `password-form.tsx`, `text-field.tsx`, `password-field.tsx`, `otp-field.tsx`
- Modify: `packages/auth/package.json`, `packages/auth/vitest.config.ts`, `packages/auth/src/server.test.ts`
- Modify (import paths only): moved forms + dashboard `(auth)` pages + `apps/dashboard/src/components/forms/contact-form.tsx` + `apps/dashboard/src/components/user/{change-email,delete-user,update-password,update-user,update-user-billing-details}.tsx`

**Interfaces:**
- Produces: module `@repo/auth/components` exporting `LoginForm, RegisterForm, RegisterConfirmForm, ResetPasswordForm, VerifyEmailForm, PasswordForm, TextField, PasswordField, OtpField` (all named). Signatures at this point are unchanged from today (props added in Task 2). `VerifyEmailForm` takes `{ email: string }`; `PasswordForm` takes `{ email: string }`; the rest take no props.

- [ ] **Step 1: Move the nine files with `git mv`**

Run from the worktree root:

```bash
mkdir -p packages/auth/src/components
for f in login-form register-form register-confirm-form reset-password-form verify-email-form password-form text-field password-field otp-field; do
  git mv "apps/dashboard/src/components/forms/$f.tsx" "packages/auth/src/components/$f.tsx"
done
```

- [ ] **Step 2: Fix the moved forms' internal imports**

The forms referenced the primitives via the dashboard's `@/` alias and `login-form` referenced the package by name; both must become relative inside the package.

In `packages/auth/src/components/login-form.tsx` make these three replacements:

```
import { useAuth } from "@repo/auth";              →  import { useAuth } from "../auth-provider";
import { TextField } from "@/components/forms/text-field";       →  import { TextField } from "./text-field";
import { PasswordField } from "@/components/forms/password-field"; →  import { PasswordField } from "./password-field";
```

In `packages/auth/src/components/register-form.tsx`:

```
import { TextField } from "@/components/forms/text-field";       →  import { TextField } from "./text-field";
import { PasswordField } from "@/components/forms/password-field"; →  import { PasswordField } from "./password-field";
```

In `packages/auth/src/components/reset-password-form.tsx`:

```
import { TextField } from "@/components/forms/text-field";  →  import { TextField } from "./text-field";
```

In `packages/auth/src/components/verify-email-form.tsx`:

```
import { TextField } from "@/components/forms/text-field";  →  import { TextField } from "./text-field";
import { OtpField } from "@/components/forms/otp-field";    →  import { OtpField } from "./otp-field";
```

In `packages/auth/src/components/password-form.tsx`:

```
import { TextField } from "@/components/forms/text-field";       →  import { TextField } from "./text-field";
import { PasswordField } from "@/components/forms/password-field"; →  import { PasswordField } from "./password-field";
```

`register-confirm-form.tsx`, `text-field.tsx`, `password-field.tsx`, `otp-field.tsx` need **no** import changes (they only import `@repo/ui/*`, `next-intl`, `next/navigation`, `lucide-react`, `react`, all valid from `@repo/auth`).

- [ ] **Step 3: Create the barrel `packages/auth/src/components/index.ts`**

```ts
export { LoginForm } from "./login-form";
export { RegisterForm } from "./register-form";
export { RegisterConfirmForm } from "./register-confirm-form";
export { ResetPasswordForm } from "./reset-password-form";
export { VerifyEmailForm } from "./verify-email-form";
export { PasswordForm } from "./password-form";
export { TextField } from "./text-field";
export { PasswordField } from "./password-field";
export { OtpField } from "./otp-field";
```

- [ ] **Step 4: Update `packages/auth/package.json`**

Replace the whole file with:

```json
{
  "name": "@repo/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./components": "./src/components/index.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@repo/queries": "workspace:*",
    "@repo/ui": "workspace:*",
    "@tanstack/react-query-devtools": "^5.90.0",
    "lucide-react": "^0.468.0"
  },
  "peerDependencies": {
    "@tanstack/react-query": "^5.62.0",
    "next": "^16.0.0",
    "next-intl": "^4.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/vitest-config": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^29.1.1",
    "next": "^16.0.0",
    "next-intl": "^4.8.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.9.0",
    "vitest": "^4.1.9"
  }
}
```

(Changes: added `./components` export; added `@repo/ui` + `lucide-react` to `dependencies`; removed `lucide-react` from `devDependencies`; added `@testing-library/react`, `@testing-library/user-event`, `jsdom` devDeps.)

- [ ] **Step 5: Switch the vitest preset and pin the server test to node**

Replace `packages/auth/vitest.config.ts` with:

```ts
import { react } from "@repo/vitest-config/react";

export default react();
```

Add a docblock as the **very first line** of `packages/auth/src/server.test.ts` (so the Next server-handler tests keep running under the node environment, not jsdom):

```ts
// @vitest-environment node
```

- [ ] **Step 6: Rewire the dashboard consumers to `@repo/auth/components`**

The `(auth)` pages import the forms and 6 non-auth components import the primitives, all via `@/components/forms/*`. Point every one of the nine moved specifiers at the new package (this deliberately does NOT touch `@/components/forms/contact-form`, which stays a dashboard file):

```bash
grep -rl "@/components/forms/" apps/dashboard/src \
  | xargs perl -pi -e 's{\@/components/forms/(login-form|register-form|register-confirm-form|reset-password-form|verify-email-form|password-form|text-field|password-field|otp-field)}{\@repo/auth/components}g'
```

Files this rewrites: `apps/dashboard/src/app/(auth)/{login,register,register/confirm,reset-password,reset-password/confirm,verify}/page.tsx`, `apps/dashboard/src/components/forms/contact-form.tsx`, and `apps/dashboard/src/components/user/{change-email,delete-user,update-password,update-user,update-user-billing-details}.tsx`.

If any single file now has two `import … from "@repo/auth/components";` lines (a file that used both `TextField` and `PasswordField`), merge them into one import statement to satisfy the dashboard's eslint.

- [ ] **Step 7: Install so pnpm links `@repo/ui` into `@repo/auth` and pulls the new devDeps**

```bash
pnpm install
```

Expected: completes without an unmet-peer error for `@repo/auth`.

- [ ] **Step 8: Verify type-check, existing tests, and the dashboard build are green**

```bash
turbo run check-types
turbo run test
turbo run build --filter=dashboard
```

Expected:
- `check-types`: all packages pass (`@repo/auth` resolves `./text-field` etc.; the dashboard resolves `@repo/auth/components`).
- `test`: `@repo/auth` runs `src/server.test.ts` under the node environment and passes; no other suites yet.
- `build --filter=dashboard`: succeeds — the `(auth)` pages render the forms from `@repo/auth/components`.

If `check-types` complains that `apps/dashboard/src/components/forms/*-form.tsx` is missing, confirm Step 1 moved them and Step 6 rewrote the page imports.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(auth): move auth-UI forms + field primitives into @repo/auth/components

Move the six auth forms and the text/password/otp field primitives out of
apps/dashboard into a new @repo/auth/components entry (raw TSX, no bundler).
Rewire the dashboard (auth) pages and the non-auth field-primitive consumers,
add @repo/ui + lucide-react as deps, and switch @repo/auth tests to the
react/jsdom preset (server.test.ts pinned to node). Behaviour unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add configurable link props to the shared forms (TDD)

**Files:**
- Create: `packages/auth/src/components/__tests__/login-form.test.tsx`
- Modify: `packages/auth/src/components/login-form.tsx`, `register-form.tsx`, `reset-password-form.tsx`, `verify-email-form.tsx`

**Interfaces:**
- Produces:
  - `LoginForm(props?: { showRegister?: boolean; registerHref?: string; resetHref?: string })` — defaults `true` / `"/register"` / `"/reset-password"`.
  - `RegisterForm(props?: { loginHref?: string })` — default `"/login"`.
  - `ResetPasswordForm(props?: { loginHref?: string })` — default `"/login"`.
  - `VerifyEmailForm(props: { email: string; loginHref?: string })` — `loginHref` default `"/login"`.

- [ ] **Step 1: Write the failing test for `LoginForm`**

Create `packages/auth/src/components/__tests__/login-form.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../auth-provider", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

import { LoginForm } from "../login-form";

describe("LoginForm", () => {
  it("renders the email field and the sign-in button", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText("john@doe.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "signIn" })).toBeTruthy();
  });

  it("shows the register link pointing at /register by default", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("link", { name: "noAccount" }).getAttribute("href"),
    ).toBe("/register");
  });

  it("hides the register link when showRegister is false", () => {
    render(<LoginForm showRegister={false} />);
    expect(screen.queryByRole("link", { name: "noAccount" })).toBeNull();
  });

  it("uses registerHref for the register link target", () => {
    render(<LoginForm registerHref="/sign-up" />);
    expect(
      screen.getByRole("link", { name: "noAccount" }).getAttribute("href"),
    ).toBe("/sign-up");
  });

  it("uses resetHref for the forgot-password link target", () => {
    render(<LoginForm resetHref="/forgot" />);
    expect(
      screen.getByRole("link", { name: "forgotPassword" }).getAttribute("href"),
    ).toBe("/forgot");
  });
});
```

- [ ] **Step 2: Run it and watch the prop tests fail**

Run: `pnpm --filter @repo/auth exec vitest run src/components/__tests__/login-form.test.tsx`
Expected: the "renders" test passes; the `showRegister`/`registerHref`/`resetHref` tests FAIL (the props don't exist yet, so the register link always shows and points at the hardcoded `/register`).

- [ ] **Step 3: Add the props to `LoginForm`**

In `packages/auth/src/components/login-form.tsx`, change the function signature:

```tsx
export function LoginForm() {
  const router = useRouter();
```

to:

```tsx
type LoginFormProps = {
  showRegister?: boolean;
  registerHref?: string;
  resetHref?: string;
};

export function LoginForm({
  showRegister = true,
  registerHref = "/register",
  resetHref = "/reset-password",
}: LoginFormProps = {}) {
  const router = useRouter();
```

Change the forgot-password link to use `resetHref`:

```tsx
          <Link
            href="/reset-password"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
```

to:

```tsx
          <Link
            href={resetHref}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
```

Wrap the register block in `showRegister` and use `registerHref`:

```tsx
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">{t("alreadyHaveAccount")}</span>
          <Link
            href="/register"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t("noAccount")}
          </Link>
        </div>
```

to:

```tsx
        {showRegister && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">{t("alreadyHaveAccount")}</span>
            <Link
              href={registerHref}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t("noAccount")}
            </Link>
          </div>
        )}
```

- [ ] **Step 4: Run the LoginForm test — all green**

Run: `pnpm --filter @repo/auth exec vitest run src/components/__tests__/login-form.test.tsx`
Expected: all 5 tests PASS.

- [ ] **Step 5: Add `loginHref` to `RegisterForm`, `ResetPasswordForm`, `VerifyEmailForm`**

`register-form.tsx` — change:

```tsx
export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register.form");
```

to:

```tsx
type RegisterFormProps = {
  loginHref?: string;
};

export function RegisterForm({ loginHref = "/login" }: RegisterFormProps = {}) {
  const router = useRouter();
  const t = useTranslations("auth.register.form");
```

and change that file's `<Link href="/login"` to `<Link href={loginHref}` (one occurrence).

`reset-password-form.tsx` — change:

```tsx
export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
```

to:

```tsx
type ResetPasswordFormProps = {
  loginHref?: string;
};

export function ResetPasswordForm({ loginHref = "/login" }: ResetPasswordFormProps = {}) {
  const t = useTranslations("auth.reset");
```

and change that file's `<Link href="/login"` to `<Link href={loginHref}` (one occurrence).

`verify-email-form.tsx` — change:

```tsx
type VerifyEmailFormProps = {
  email: string;
};

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
```

to:

```tsx
type VerifyEmailFormProps = {
  email: string;
  loginHref?: string;
};

export function VerifyEmailForm({ email, loginHref = "/login" }: VerifyEmailFormProps) {
```

and change **both** occurrences of `<Link href="/login"` to `<Link href={loginHref}` in that file (there are two — the success block and the form footer).

- [ ] **Step 6: Type-check to confirm the new signatures compile**

Run: `pnpm --filter @repo/auth check-types`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add packages/auth/src/components
git commit -m "feat(auth): configurable navigation links on shared auth forms

Add optional showRegister/registerHref/resetHref to LoginForm and loginHref to
Register/ResetPassword/VerifyEmail forms; defaults reproduce current dashboard
behaviour. Covered by LoginForm render + prop tests.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Render-smoke tests for the remaining forms

**Files:**
- Create: `packages/auth/src/components/__tests__/{register-form,register-confirm-form,reset-password-form,verify-email-form,password-form}.test.tsx`

**Interfaces:**
- Consumes: the exports and signatures produced by Tasks 1–2.

- [ ] **Step 1: Write the five smoke tests**

Create `packages/auth/src/components/__tests__/register-form.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@repo/queries", () => ({
  useAuthRegister: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { RegisterForm } from "../register-form";

describe("RegisterForm", () => {
  it("renders the sign-up button", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: "signUp" })).toBeTruthy();
  });

  it("links back to /login by default and honours loginHref", () => {
    const { rerender } = render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "signIn" }).getAttribute("href")).toBe("/login");
    rerender(<RegisterForm loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "signIn" }).getAttribute("href")).toBe("/enter");
  });
});
```

Create `packages/auth/src/components/__tests__/register-confirm-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { RegisterConfirmForm } from "../register-confirm-form";

describe("RegisterConfirmForm", () => {
  it("renders the continue button", () => {
    render(<RegisterConfirmForm />);
    expect(screen.getByRole("button", { name: "button" })).toBeTruthy();
  });
});
```

Create `packages/auth/src/components/__tests__/reset-password-form.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@repo/queries", () => ({
  useAuthRequestNewPassword: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { ResetPasswordForm } from "../reset-password-form";

describe("ResetPasswordForm", () => {
  it("renders the submit button", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByRole("button", { name: "submit" })).toBeTruthy();
  });

  it("links back to /login by default and honours loginHref", () => {
    const { rerender } = render(<ResetPasswordForm />);
    expect(screen.getByRole("link", { name: "login" }).getAttribute("href")).toBe("/login");
    rerender(<ResetPasswordForm loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "login" }).getAttribute("href")).toBe("/enter");
  });
});
```

Create `packages/auth/src/components/__tests__/verify-email-form.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@repo/queries", () => ({
  useAuthActivate: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { VerifyEmailForm } from "../verify-email-form";

describe("VerifyEmailForm", () => {
  it("renders the submit button and the disabled email field", () => {
    render(<VerifyEmailForm email="john@doe.com" />);
    expect(screen.getByRole("button", { name: "submit" })).toBeTruthy();
    expect(screen.getByDisplayValue("john@doe.com")).toBeTruthy();
  });

  it("links back to login and honours loginHref", () => {
    const { rerender } = render(<VerifyEmailForm email="john@doe.com" />);
    expect(screen.getByRole("link", { name: "backToLogin" }).getAttribute("href")).toBe("/login");
    rerender(<VerifyEmailForm email="john@doe.com" loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "backToLogin" }).getAttribute("href")).toBe("/enter");
  });
});
```

Create `packages/auth/src/components/__tests__/password-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@repo/queries", () => ({
  useAuthResetPassword: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { PasswordForm } from "../password-form";

describe("PasswordForm", () => {
  it("renders the reset button", () => {
    render(<PasswordForm email="john@doe.com" />);
    expect(screen.getByRole("button", { name: "resetButton" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the whole `@repo/auth` suite**

Run: `pnpm --filter @repo/auth test`
Expected: all suites PASS — `server.test.ts` (node env) plus the six component test files (jsdom).

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/components/__tests__
git commit -m "test(auth): render-smoke tests for the shared auth forms

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: README — wiring auth into a new app

**Files:**
- Create: `packages/auth/README.md`

- [ ] **Step 1: Write `packages/auth/README.md`**

```markdown
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

   \`\`\`tsx
   import { LoginForm } from "@repo/auth/components";
   export default function LoginPage() {
     return <LoginForm />;
   }
   \`\`\`

4. **Server.** Re-export the handlers as route handlers and use the middleware:

   \`\`\`ts
   // app/api/auth/login/route.ts
   export { loginHandler as POST } from "@repo/auth/server";
   // proxy.ts
   import { createAuthMiddleware } from "@repo/auth/server";
   \`\`\`

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

\`\`\`tsx
<LoginForm showRegister={false} />
\`\`\`
```

- [ ] **Step 2: Final full verification**

Run:

```bash
turbo run check-types
turbo run test
turbo run build --filter=dashboard
```

Expected: all green. This is the state the ticket's acceptance criteria require (`turbo run check-types` and `turbo run test` pass for `@repo/auth` and the dashboard; the dashboard renders the shared forms).

- [ ] **Step 3: Commit**

```bash
git add packages/auth/README.md
git commit -m "docs(auth): README for wiring shared auth UI + logic into an app

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the executor

- **End-to-end check is separate.** After this plan, verify the dashboard `(auth)` flows in a browser via `/project:test-ticket` (Playwright) — unit tests here are render-smoke + prop level only.
- **`@repo/ui` untouched.** If you ever feel the urge to move a primitive into `@repo/ui`, stop: the primitives depend on `next-intl`, which would break `@repo/ui`'s purity (see the spec's rationale).
- **Post-login redirect.** `LoginForm` currently does `router.push("/")` after a successful login. That is left unchanged in this ticket; a web-specific destination is #9's concern. If it needs to become a prop later, add `homeHref` the same way the link props were added — do not change it here.
