# Dashboard Phase F — Support + Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the last feature (support page + contact form) into `apps/dashboard`, then finalize the whole app port with a full green build. After the plan tasks, the controller runs the broad whole-app review and a single consolidated fix wave for any blocking findings.

**Architecture:** The `ContactForm` consumes `@repo/queries` `useMailContactSupport` (`{ data: MailContactSupportBody }`), `@repo/auth` `useAuth` (to prefill name/email), `@repo/ui` (Card, Textarea, Button + the app `TextField`), `@repo/ui/hooks/use-toast`, and next-intl (`forms.support`). This is the final phase of Plan 5.

**Tech Stack:** Next 16, React 19, next-intl v4, `@repo/ui`, `@repo/queries`, `@repo/auth`.

## Global Constraints

- Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (`pnpm --filter dashboard <script>`; quote `(dashboard)` paths).
- **Port-and-adapt** from `…/nextjs-dashboard-boilerplate/src/components/forms/ContactForm.tsx` + `…/(dashboard)/support/page.tsx`.
- **Smart inputs:** `InputField` → app `TextField`; the boilerplate `TextArea` smart input → `@repo/ui/components/ui/textarea` `Textarea` + `@repo/ui/components/ui/label` `Label` (inline, app-side).
- **Confirmed hook:** `useMailContactSupport()` → `mutateAsync({ data: MailContactSupportBody })` where `MailContactSupportBody = { name: string; email: string; subject: string; message: string; attachment?: Blob }`.
- **`extractErrorMessage`** from `@repo/queries`. **Toast:** `useToast`/`toast` from `@repo/ui/hooks/use-toast` — drop `variant: "success"` (→ default); keep `destructive` for errors.
- **Token classes ONLY** — replace boilerplate grays (`text-gray-700`→`text-foreground`, `text-gray-500`→`text-muted-foreground`, `file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-700`→token equivalents / `Button`-styled label).
- **i18n:** `forms.support` namespace is present. If a SPECIFIC key is missing, add to BOTH `packages/i18n/src/messages/{en,nl}.json` symmetrically (real Dutch) + run `pnpm --filter @repo/i18n test`; report it.
- Phase gate: `pnpm --filter dashboard check-types` + `pnpm --filter dashboard build`.
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/src/components/forms/contact-form.tsx` *(create)*.
- `apps/dashboard/src/app/(dashboard)/support/page.tsx` *(create)*.

---

### Task 1: Contact form + support page

**Files:** Create `src/components/forms/contact-form.tsx`, `(dashboard)/support/page.tsx`.

**contact-form.tsx rules:**
- `"use client"`; `useTranslations("forms.support")`; `const { user } = useAuth()` (`@repo/auth`); `useMailContactSupport()` (`@repo/queries`) + `useToast`.
- `@repo/ui` `Card` family + `Button`. Fields: `name` (`TextField` text, required, disabled when `user?.id`), `email` (`TextField` email, required, disabled when `user?.id`), `subject` (`TextField` text, required), `message` (`@repo/ui` `Textarea` + `Label`, required), `attachment` (hidden/styled `<input type="file" accept=".jpg,.jpeg,.png,.gif">`).
- Seed `name`/`email` from `user` via `useEffect` (full name = `${user.name} ${user.surname}`.trim()).
- File validation on change: allowed types `image/jpeg,image/jpg,image/png,image/gif`; size ≤ 3 MB → on failure `toast({ variant: "destructive", title: t("errorTitle"), description: t("fileTypeError")/t("fileSizeError") })` + clear the input.
- Submit: `await mutateAsync({ data: { name, email, subject, message, ...(attachment ? { attachment } : {}) } })`; on success: reset subject/message/attachment (+ clear the file input), `toast({ title: t("successTitle"), description: t("success") })` (DEFAULT variant). On error: `toast({ variant: "destructive", title: t("errorTitle"), description: extractErrorMessage(err) ?? ... })`. Submit `Button` disabled while `isPending`.
- TOKEN classes only (the file input's `file:` classes use tokens; the attachment hint `<p>` uses `text-muted-foreground`).

**support/page.tsx (server):**
```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = { title: "Support — Tintsmith" };

export default function SupportPage() {
  return (
    <div className="space-y-6 p-4 md:p-12">
      <div className="flex pt-12 md:h-[calc(100vh-6rem)] md:items-center md:justify-center md:pt-0">
        <div className="w-full md:w-3/4 lg:w-1/2">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 1: Read the boilerplate ContactForm + support page; create the two files** (message via `@repo/ui` Textarea+Label; token-normalize the file input).
- [ ] **Step 2: Type-check** — `pnpm --filter dashboard check-types` → PASS (+ `pnpm --filter @repo/i18n test` if i18n edited).
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): support contact form + page"`.

---

### Task 2: Final build + green gate

**Files:** none.

- [ ] **Step 1: Type-check the whole app** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 2: Full production build** — `pnpm --filter dashboard build` → SUCCESS. Expect the `/support` route plus all prior routes (home, auth ×6, organisation ×4, settings ×4). Report the full route table.
   A real failure must be reported with the exact error; do not delete a component to go green. Clear `apps/dashboard/.next` and rebuild if a stale-cache error appears.
- [ ] **Step 3: Run the package gates** — `pnpm --filter @repo/i18n test` (parity 8/8) and `pnpm --filter @repo/queries test` (the data-layer unit tests) and `pnpm --filter @repo/auth test` (the BFF tests) → all PASS. Also `pnpm --filter web check-types` (confirm the sibling app still type-checks). Report each.
- [ ] **Step 4:** Record results (verification-only; commit only if a tracked file changed).

---

## After the plan tasks (controller-run, not plan steps)

1. **Whole-app final review (opus):** dispatch a broad review over the entire `apps/dashboard` port (range from before Phase A wiring to HEAD), focused on cross-cutting concerns — provider/auth/data flow end-to-end, token-purity consistency, RSC/client boundaries, the BFF + middleware/proxy security surface, and consistency across the ported features — and to triage the accumulated phase backlog (which items must fix before merge vs defer).
2. **Consolidated fix wave:** dispatch ONE fix subagent with the complete list of must-fix findings from the final review.
3. **finishing-a-development-branch:** present the integration options for the completed branch.

## Self-Review

**Spec coverage (Phase F slice):** support page + `ContactForm` (Task 1); the final whole-app green gate (Task 2); the whole-app review + fix wave + finishing happen after (controller steps). ✓
**Placeholder scan:** `ContactForm` is port-and-adapt against the named boilerplate file with explicit hook/DTO, the Textarea adaptation, file validation, toast/error rules, and token rules; the support page is exact code. Concrete artifacts.
**Type/name consistency:** `useMailContactSupport` + `MailContactSupportBody` + `extractErrorMessage` verified in `@repo/queries`; `useAuth` in `@repo/auth`; `Card`/`Textarea`/`Label`/`Button` in `@repo/ui`; `forms.support` namespace present. `ContactForm` (Task 1) consumed by the support page (Task 1).
**Verification:** check-types + the Task 2 full build + the package test suites (i18n parity, @repo/queries unit, @repo/auth BFF). Live support-mail send against the API is best-effort/human.
