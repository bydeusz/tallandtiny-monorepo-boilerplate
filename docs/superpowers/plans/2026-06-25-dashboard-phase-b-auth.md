# Dashboard Phase B — Auth Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the boilerplate's auth surface into `apps/dashboard`: an app-level `Field` form layer (built on `@repo/ui` primitives), the `(auth)` layout, and the six auth flows (login, register +confirm, reset-password +confirm, verify), wired to `@repo/auth` (`useAuth`) and `@repo/queries` (generated auth hooks).

**Architecture:** The shared `@repo/ui` ships dumb token primitives (`Input`, `Label`, `Button`); this phase builds the app's `Field` components (`TextField`/`PasswordField`/`OtpField`) that add validation + i18n error text on top, replacing the boilerplate's smart `InputField`/`PasswordInput`. Forms call the existing `@repo/queries` generated mutations (or `useAuth().login`), surface errors via `@repo/queries`' `extractErrorMessage` + `@repo/ui` `Alert`, and translate via next-intl (`@repo/i18n` already ships the `auth.*` + `inputs.errors.*` catalogs). This is Phase B of Plan 5.

**Tech Stack:** Next 16, React 19, next-intl v4, `@repo/ui`, `@repo/queries`, `@repo/auth`, `@repo/i18n` (translations), lucide-react.

## Global Constraints

- Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (use `pnpm --filter dashboard <script>`).
- **Boilerplate source of truth:** the originals live under `/Users/tadeuszderuijter/dev/boilerplate/nextjs-dashboard-boilerplate/src/`. Port-and-adapt tasks read the named file and apply the adaptation rules; they do NOT copy hardcoded colors or the boilerplate's smart inputs.
- **Token classes ONLY** — no hardcoded palette colors (`gray-*`,`red-*`,`white`, etc.). Use semantic tokens (`text-foreground`,`text-muted-foreground`,`text-destructive`,`bg-muted`,`bg-background`,`border-input`,`ring-ring`,`bg-primary text-primary-foreground`). Errors use `text-destructive` / `Alert variant="destructive"`.
- **No smart inputs from the boilerplate** — forms use the app `Field` components (Task 1). Field components live in `apps/dashboard/src/components/forms/`.
- **i18n:** components use `useTranslations("<namespace>")` with the SAME keys the boilerplate used (the catalogs ship those keys). Namespaces: `inputs.errors`, `auth.login`, `auth.register.form`, `auth.register.confirm`, `auth.reset`, `auth.verify`.
- **Errors:** use `extractErrorMessage` from `@repo/queries` (do NOT write a new error helper) for generated-mutation failures; render in `Alert`/`AlertDescription` (`@repo/ui/components/ui/alert`), variant `destructive`.
- **Generated mutations** (from `@repo/queries`): `useAuthRegister`, `useAuthRequestNewPassword`, `useAuthResetPassword`, `useAuthActivate`. orval mutation call shape is `mutateAsync({ data: <Dto> })`. Login is `useAuth().login({ email, password })` from `@repo/auth`.
- Phase gate: `pnpm --filter dashboard check-types` per task + `pnpm --filter dashboard build` (final task). No unit tests (UI/forms; verified by build + reviews; live submit is best-effort/human).
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/src/components/forms/text-field.tsx`, `password-field.tsx`, `otp-field.tsx` *(create)* — the Field layer.
- `apps/dashboard/src/app/(auth)/layout.tsx` *(create)* — token-normalized auth layout.
- `apps/dashboard/public/img/mood-bg.jpg` *(copy)*.
- `apps/dashboard/src/components/forms/{login,register,register-confirm,reset-password,password,verify-email}-form.tsx` *(create — ports)*.
- `apps/dashboard/src/app/(auth)/{login,register,register/confirm,reset-password,reset-password/confirm,verify}/page.tsx` *(create)*.

---

### Task 1: Field layer (TextField, PasswordField, OtpField)

**Files:**
- Create: `apps/dashboard/src/components/forms/text-field.tsx`, `password-field.tsx`, `otp-field.tsx`

**Interfaces — Produces:**
- `TextField` props: `{ label; name; id; type?: "text"|"email"|"url"|"tel"|"number"; placeholder?; required?; disabled?; value: string; onChange: ChangeEventHandler<HTMLInputElement> }`.
- `PasswordField` props: same minus `type` (always password) — adds internal show/hide.
- `OtpField` props: `{ length?: number; value: string; onChange: (value: string) => void; disabled? }`.

- [ ] **Step 1: Create `text-field.tsx`**

```tsx
"use client";

import { useState, type ChangeEventHandler } from "react";
import { useTranslations } from "next-intl";
import { AlertCircleIcon } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { cn } from "@repo/ui/lib/utils";

type TextFieldProps = {
  label: string;
  name: string;
  id: string;
  type?: "text" | "email" | "url" | "tel" | "number";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function TextField({
  label,
  name,
  id,
  type = "text",
  placeholder,
  required,
  disabled,
  value,
  onChange,
}: TextFieldProps) {
  const t = useTranslations("inputs.errors");
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (required && !value) {
      setError(t("required"));
      return;
    }
    if (type === "email" && !value.includes("@")) {
      setError(t("email"));
      return;
    }
    if (type === "url") {
      try {
        new URL(value);
      } catch {
        setError(t("url"));
        return;
      }
    }
    if (type === "tel" && !/^\+?\d{7,14}$/.test(value)) {
      setError(t("tel"));
      return;
    }
    setError(null);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          onBlur={validate}
          aria-invalid={error ? true : undefined}
          className={cn(error && "pr-9")}
        />
        {error && (
          <AlertCircleIcon className="text-destructive pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `password-field.tsx`**

```tsx
"use client";

import { useState, type ChangeEventHandler } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";

type PasswordFieldProps = {
  label: string;
  name: string;
  id: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function PasswordField({
  label,
  name,
  id,
  placeholder,
  required,
  disabled,
  value,
  onChange,
}: PasswordFieldProps) {
  const t = useTranslations("inputs.errors");
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  function validate() {
    setError(required && !value ? t("required") : null);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          onBlur={validate}
          aria-invalid={error ? true : undefined}
          className="pr-9"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create `otp-field.tsx`**

```tsx
"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpFieldProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function OtpField({
  length = 6,
  value,
  onChange,
  disabled,
}: OtpFieldProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) {
      return;
    }
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 size-12 rounded-md border text-center text-lg font-medium outline-none focus-visible:ring-[3px] disabled:opacity-50"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter dashboard check-types`
Expected: PASS. (If `@repo/ui/components/ui/label` is missing, it was added in Plan 2 Task 1 — verify the export path.)

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/forms/
git commit -m "feat(dashboard): app Field layer (TextField, PasswordField, OtpField)"
```

---

### Task 2: (auth) layout + background asset

**Files:**
- Create: `apps/dashboard/src/app/(auth)/layout.tsx`
- Copy: `apps/dashboard/public/img/mood-bg.jpg`

- [ ] **Step 1: Copy the background image**

Run:
```bash
mkdir -p apps/dashboard/public/img
cp "/Users/tadeuszderuijter/dev/boilerplate/nextjs-dashboard-boilerplate/public/img/mood-bg.jpg" apps/dashboard/public/img/mood-bg.jpg
```
Expected: the image is copied. (If the source file does not exist, report it — the layout still type-checks/builds; a missing public asset is a runtime 404, not a build error.)

- [ ] **Step 2: Create the layout**

`apps/dashboard/src/app/(auth)/layout.tsx`:
```tsx
import Image from "next/image";
import { LanguageSwitcher } from "@repo/i18n";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden lg:flex lg:w-1/3 xl:w-1/2">
        <Image
          src="/img/mood-bg.jpg"
          alt=""
          width={1080}
          height={1350}
          priority
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="bg-muted relative flex w-full items-center justify-center p-4 md:p-0 lg:w-2/3 xl:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
        <div className="absolute right-6 top-4">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter dashboard check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/dashboard/src/app/(auth)/layout.tsx" apps/dashboard/public/img/mood-bg.jpg
git commit -m "feat(dashboard): token-normalized (auth) layout + background"
```

---

### Task 3: Login form + page

**Files:**
- Create: `apps/dashboard/src/components/forms/login-form.tsx`
- Create: `apps/dashboard/src/app/(auth)/login/page.tsx`

**Port from:** `src/components/forms/LoginForm.tsx` + `src/app/(auth)/login/page.tsx`.

**Adaptation rules (login-form.tsx):**
- `"use client"`. Use `useTranslations("auth.login")` and `useRouter` (next/navigation).
- Use `useAuth()` from `@repo/auth`; on submit call `await login({ email, password })`; on success `router.push("/")` + `router.refresh()`.
- Fields: email → `TextField` (`type="email"`, required); password → `PasswordField` (required). Both controlled via local `useState`.
- Submit button → `@repo/ui` `Button` (full width). Disable + show a loading label while submitting (local `isSubmitting` state).
- Errors: catch the thrown error from `login`; map known codes the boilerplate handled (`MissingCredentials`,`UserNotFound`,`InvalidCredentials`,`EmailNotVerified`,`PasswordResetRequired`) to `t("errors.<code>")` where those keys exist, falling back to `t("errors.default")` (use the exact keys present under `auth.login.errors` in the catalog; if the message isn't a known code, show the raw message or the default). Render via `Alert variant="destructive"` + `AlertTitle`(`t("errorTitle")`)/`AlertDescription`.
- Links: `t("forgotPassword")` → `/reset-password`; `t("noAccount")` → `/register` (use `next/link`).
- Token classes only.

**page.tsx (server):**
```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign in — Tall & Tiny" };

export default function LoginPage() {
  return <LoginForm />;
}
```
(`@/` is the dashboard's path alias for `src/`; confirm it resolves — the app's tsconfig defines it. If not, use a relative import.)

- [ ] **Step 1: Create `login-form.tsx`** per the rules above (read the boilerplate `LoginForm.tsx` for the exact error-code switch + copy/links; reproduce the behavior with the Field components + tokens).
- [ ] **Step 2: Create `login/page.tsx`** as shown.
- [ ] **Step 3: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 4: Commit** — `git add` the two files; `git commit -m "feat(dashboard): login form + page"`.

---

### Task 4: Register + confirm

**Files:**
- Create: `apps/dashboard/src/components/forms/register-form.tsx`, `register-confirm-form.tsx`
- Create: `apps/dashboard/src/app/(auth)/register/page.tsx`, `register/confirm/page.tsx`

**Port from:** `RegisterForm.tsx`, `RegisterConfirm.tsx`, `register/page.tsx`, `register/confirm/page.tsx`.

**register-form.tsx rules:**
- `"use client"`; `useTranslations("auth.register.form")`; `useRouter`.
- `const { mutateAsync: register } = useAuthRegister()` (from `@repo/queries`).
- Fields: `firstname` (TextField text), `surname` (TextField text), `email` (TextField email, required), `password` (PasswordField required).
- Submit: guard `password.length < 8` (show `t(...)` length error). Call `await register({ data: { email, name: firstname, surname, password } })`. On success: `sessionStorage.setItem("registerEmail", email)`; `router.push("/register/confirm")`.
- Errors: `extractErrorMessage(err)` (from `@repo/queries`) → `Alert variant="destructive"`.
- Link: `t(...)` → `/login`.

**register-confirm-form.tsx rules:**
- `"use client"`; `useTranslations("auth.register.confirm")`; `useRouter`.
- On mount read `sessionStorage.getItem("registerEmail")` into state (guard `typeof window`).
- Display title + description (`t("description", { email })`, fall back to `t("emailFallback")` when empty).
- Button (`t("button")`) → `router.push("/login")`.

**pages (server):**
- `register/page.tsx` → renders `<RegisterForm />`, metadata title "Create account — Tall & Tiny".
- `register/confirm/page.tsx` → renders `<RegisterConfirmForm />`, metadata title "Confirm your email — Tall & Tiny".

- [ ] **Step 1: Create the two form components** per rules.
- [ ] **Step 2: Create the two pages.**
- [ ] **Step 3: Type-check** → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(dashboard): register + confirm forms and pages"`.

---

### Task 5: Reset-password + set-new-password

**Files:**
- Create: `apps/dashboard/src/components/forms/reset-password-form.tsx`, `password-form.tsx`
- Create: `apps/dashboard/src/app/(auth)/reset-password/page.tsx`, `reset-password/confirm/page.tsx`

**Port from:** `ResetPassword.tsx`, `PasswordForm.tsx`, `reset-password/page.tsx`, `reset-password/confirm/page.tsx`.

**reset-password-form.tsx rules:**
- `"use client"`; `useTranslations("auth.reset")`.
- `const { mutateAsync: requestNewPassword } = useAuthRequestNewPassword()`.
- Field: `email` (TextField email, required).
- Submit: `await requestNewPassword({ data: { email } })`. On success: show `Alert variant="default"` with `t("success")` and clear the field (no redirect). On error: `extractErrorMessage` → `Alert variant="destructive"`.
- Link: `t("login")` → `/login`.

**password-form.tsx rules:**
- `"use client"`; `useTranslations("auth.reset")`; props `{ email: string }`.
- `const { mutateAsync: resetPassword } = useAuthResetPassword()`.
- Fields: `email` (TextField email, required, **disabled**, value = prop), `temporaryPassword`/`newPassword`/`confirmPassword` (PasswordField required).
- Submit guards: missing email → `t("missingEmail")`; `newPassword !== confirmPassword` → `t("errors.passwordMismatch")`; `newPassword.length < 8` → `t("errors.passwordLength")`. Then `await resetPassword({ data: { email, temporaryPassword, newPassword } })`. On success: `router.push("/login?reset=success")`.
- Errors: special-case the backend message `"Temporary password has expired."` → `t("errors.expired")`; otherwise `extractErrorMessage` → `Alert variant="destructive"`.

**pages:**
- `reset-password/page.tsx` (server) → `<ResetPasswordForm />`, title "Reset password — Tall & Tiny".
- `reset-password/confirm/page.tsx` (**async server**) → `await searchParams`; if no `email`, `redirect("/reset-password")` (from `next/navigation`); else `<PasswordForm email={email} />`. Signature: `export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> })`.

- [ ] **Step 1: Create the two form components** per rules.
- [ ] **Step 2: Create the two pages** (note the async searchParams + redirect on the confirm page).
- [ ] **Step 3: Type-check** → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(dashboard): reset-password + set-new-password forms and pages"`.

---

### Task 6: Verify email

**Files:**
- Create: `apps/dashboard/src/components/forms/verify-email-form.tsx`
- Create: `apps/dashboard/src/app/(auth)/verify/page.tsx`

**Port from:** `VerifyEmail.tsx`, `verify/page.tsx`.

**verify-email-form.tsx rules:**
- `"use client"`; `useTranslations("auth.verify")`; props `{ email: string }`.
- `const { mutateAsync: activate } = useAuthActivate()`.
- Fields: `email` (TextField email, **disabled**, value = prop), code → `OtpField` (length 6, controlled `code` state).
- Submit guards: no email → `t("missingEmail")`; `code.length !== 6` → `t("codeRequired")`. Then `await activate({ data: { email, code } })`. On success: set `isSuccess = true`; show `Alert variant="default"` with `t("success")` + a `t("backToLogin")` link to `/login` (no auto-redirect).
- Errors: `extractErrorMessage` → `Alert variant="destructive"`.

**page.tsx (async server):**
```tsx
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/forms/verify-email-form";

export const metadata: Metadata = { title: "Verify email — Tall & Tiny" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailForm email={email ?? ""} />;
}
```

- [ ] **Step 1: Create `verify-email-form.tsx`** per rules.
- [ ] **Step 2: Create `verify/page.tsx`** as shown.
- [ ] **Step 3: Type-check** → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(dashboard): verify-email form + page"`.

---

### Task 7: Build smoke

**Files:** none.

- [ ] **Step 1: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 2: Build** — `pnpm --filter dashboard build` → SUCCESS. Expect the new routes in the output: `/login`, `/register`, `/register/confirm`, `/reset-password`, `/reset-password/confirm`, `/verify` (the last two dynamic due to `searchParams`). Report the route table.
   If a route fails to prerender because it reads `searchParams`, that's expected (it becomes dynamic) — not a failure. A real failure (missing import, type error, bad token class) must be reported with the exact error; do not delete a form to go green.
- [ ] **Step 3:** Record the green build in the report (verification-only; commit only if a tracked file changed).

---

## Self-Review

**Spec coverage (Phase B slice):** `(auth)` layout (Task 2); Field layer replacing smart inputs (Task 1); the 6 forms + 6 pages (Tasks 3–6); `mood-bg.jpg` (Task 2); build gate (Task 7). ✓
**Placeholder scan:** Field components + layout + the two simplest pages are exact code; the 6 forms + 4 remaining pages are port-and-adapt against named boilerplate files with explicit, concrete rules (hook, fields→Field, submit, redirect, error via `extractErrorMessage`+`Alert`, i18n namespace, links) — concrete artifacts, not vague directives.
**Type/name consistency:** `TextField`/`PasswordField`/`OtpField` (Task 1) consumed by Tasks 3–6; `useAuth` (`@repo/auth`), `useAuthRegister`/`useAuthRequestNewPassword`/`useAuthResetPassword`/`useAuthActivate` + `extractErrorMessage` (`@repo/queries`), `Alert`/`Button`/`Input`/`Label` (`@repo/ui`), `LanguageSwitcher` (`@repo/i18n`) — all verified against the produced package APIs and the boilerplate's usage.
**Verification model:** check-types per task + the Task 7 build (catches imports, types, RSC/searchParams, token classes). Live submit (register/login/activate against the running API) is best-effort/human; the build is the hard gate. Reviewers verify token purity + correct hook/redirect/i18n-namespace per form.
**Reviewer note:** the forms are ported from named boilerplate files; reviewers should confirm the adaptation (Field components used, correct `@repo/queries` hook + `{ data: Dto }` shape, `extractErrorMessage`, correct success redirect, token-only classes, i18n namespace) rather than byte-matching the boilerplate.
