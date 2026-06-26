# Dashboard Phase E — Settings + User Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the settings + user feature into `apps/dashboard`: the user forms (update name, billing, avatar, email, password, delete account), the `useRoles` hook, and the settings pages + tabbed layout — adapted to the shared packages.

**Architecture:** App-specific user components live under `apps/dashboard/src/components/user/`; `useRoles` under `src/hooks/`. They consume `@repo/queries` (user + auth + file mutations + `extractErrorMessage` + `getAuthGetCurrentUserQueryKey`), `@repo/auth` (`useAuth` for the current user + `logout`), `@repo/ui` (Card, Dialog, Select, Avatar, Alert, Skeleton, Button + the app `TextField`/`PasswordField`), `@repo/ui/hooks/use-toast`, and next-intl. The settings layout mirrors `organisation/layout.tsx` (Header + `NavLink` tabs). This is Phase E of Plan 5. The detailed per-component digest is in `.superpowers/sdd/phasee-inventory.md`.

**Tech Stack:** Next 16, React 19, TanStack Query v5, next-intl v4, `@repo/ui`, `@repo/queries`, `@repo/auth`.

## Global Constraints (shared adaptation rules)

- Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (`pnpm --filter dashboard <script>`; quote `(dashboard)` paths).
- **Port-and-adapt:** read the named boilerplate file under `…/nextjs-dashboard-boilerplate/src/` AND the matching section of `.superpowers/sdd/phasee-inventory.md`; reproduce the behaviour with the monorepo's shared pieces + tokens. Do NOT copy hardcoded colors or the boilerplate smart inputs.
- **Smart inputs:** `InputField` → app `TextField` (`@/components/forms/text-field`); password inputs → app `PasswordField` (`@/components/forms/password-field`); native country `<select>` → `@repo/ui/components/ui/select` primitives.
- **Confirmed `@repo/queries` hooks** (exact): `useUserUpdate` (`{ id, data: UpdateUserDto }`), `useUserDelete` (`{ id }`), `useAuthChangePassword` (`{ data: { currentPassword, newPassword } }`), `useAuthRequestEmailChange` (`{ data: { newEmail } }`), `useFileReplace` (`{ scope: "user", ownerId, folder: "avatar", data: { file } }` → `FileResponseDto.downloadUrl`). `UpdateUserDto` fields (all optional): `name`, `surname`, `address`, `postalCode`, `city`, `country`, `kvk`, `vatNumber`. Invalidation: `getAuthGetCurrentUserQueryKey()` (from `@repo/queries`).
- **`extractErrorMessage` ALREADY EXISTS in `@repo/queries`** — import it (`import { extractErrorMessage } from "@repo/queries"`); do NOT create a new helper/lib.
- **Current user + auth:** `const { user, isLoading, logout } = useAuth()` (`@repo/auth`). `user` is `UserResponseDto`. `logout()` already clears the token, pushes `/login`, and refreshes — UpdatePassword + DeleteUser call `await logout()` on success (NO success toast).
- **Toast:** `useToast`/`toast` from `@repo/ui/hooks/use-toast`. Our toast has only `default` + `destructive` — drop `variant: "success"` (omit → default); keep `variant: "destructive"` for errors. UpdatePassword + DeleteUser show errors via inline `Alert variant="destructive"` (NOT toast).
- **After user mutations** (update-user, billing, avatar): `queryClient.invalidateQueries({ queryKey: getAuthGetCurrentUserQueryKey() })` + `router.refresh()`. ChangeEmail clears the field (no invalidation).
- **Token classes ONLY** — replace boilerplate grays per the inventory color map (`text-gray-500/600`→`text-muted-foreground`, `text-gray-900`→`text-foreground`, `bg-gray-50/100/200`→`bg-muted`, `ring-gray-*`→`ring-border`, `border-gray-200`→`border-border`).
- **i18n:** namespaces are all present (`forms.user-{update,avatar,email,password,billing,delete}`, `modals.delete`, `pages.settings`, `common.data.roles`). If a SPECIFIC key is missing (e.g. an avatar `hint`), add to BOTH `packages/i18n/src/messages/{en,nl}.json` symmetrically (real Dutch), then run `pnpm --filter @repo/i18n test`; report it.
- Phase gate: `pnpm --filter dashboard check-types` per task + `pnpm --filter dashboard build` (final task). Live CRUD is best-effort/human.
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/src/hooks/use-roles.ts` *(create)*.
- `apps/dashboard/src/components/user/{update-user,update-user-billing-details,update-avatar,change-email,update-password,delete-user}.tsx` *(create)*.
- `apps/dashboard/src/app/(dashboard)/settings/{layout,page}.tsx`, `settings/{account,delete,subscription}/page.tsx` *(create)*.

---

### Task 1: use-roles + update-password + change-email

**Files:** Create `src/hooks/use-roles.ts`; `src/components/user/update-password.tsx`, `change-email.tsx`.
**Port from:** `hooks/useRoles.tsx`, `components/user/UpdatePassword.tsx`, `ChangeEmail.tsx` (inventory §7, §4, §3).

**use-roles.ts rules:** `useTranslations("common.data.roles")`; returns `Array<{ label: string; value: string }>` with a blank first entry `{ label: " ", value: " " }` then `designer/sales/softwareEngineer/manager/seoSpecialist/contentCreator` (label = `t(key)`, value = the human role string as in the boilerplate). Not wired to any component — port for completeness.

**update-password.tsx rules:** `"use client"`; `useTranslations("forms.user-password")`; `const { logout } = useAuth()`; `useAuthChangePassword()`. `@repo/ui` `Card` family + `Button` + `Alert`. Fields: `currentPassword`/`newPassword`/`confirmPassword` via `PasswordField`. Client validation: `newPassword !== confirmPassword` → inline error `t("errors.passwordMismatch")`; `newPassword.length < 8` → `t("errors.passwordLength")`. Submit: `await mutateAsync({ data: { currentPassword, newPassword } })`; on success `await logout()` (no toast). On error: inline `Alert variant="destructive"` (`extractErrorMessage` fallback `t("errors.default")`). Preserve the boilerplate quirk: `setIsLoading(false)` only on error (logout navigates away).

**change-email.tsx rules:** `"use client"`; `useTranslations("forms.user-email")`; `useAuth()` for `user.email`; `useAuthRequestEmailChange()` + `useToast`. `@repo/ui` `Card` family + `Button`. Fields: `currentEmail` (`TextField` type email, disabled, value = `user.email`), `newEmail` (`TextField` type email, required). Submit: `await mutateAsync({ data: { newEmail } })`; success `toast({ title: t("successTitle"), description: t("successDescription") })` (default variant) + clear `newEmail`. Error → `toast({ variant: "destructive", title: t("errorTitle"), description: extractErrorMessage(err) ?? ... })`. Submit disabled if `!newEmail.trim()`.

- [ ] **Step 1: Read the boilerplate originals + inventory §7/§4/§3; create the three files.**
- [ ] **Step 2: Type-check** — `pnpm --filter dashboard check-types` → PASS (+ `pnpm --filter @repo/i18n test` if i18n edited).
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): useRoles + update-password + change-email"`.

---

### Task 2: update-user + billing details

**Files:** Create `src/components/user/update-user.tsx`, `update-user-billing-details.tsx`.
**Port from:** `components/user/UpdateUser.tsx`, `UpdateUserBillingDetails.tsx` (inventory §1, §6).

**update-user.tsx rules:** `"use client"`; `useTranslations("forms.user-update")`; `const { user, isLoading } = useAuth()`; `useUserUpdate()` + `useQueryClient` + `useRouter` + `useToast`. `@repo/ui` `Card` + `Button`; fields `firstname`→`name`, `surname`→`surname` via `TextField` in a `grid grid-cols-2 gap-4`. Seed from `user` via `useEffect` (only when form empty). Submit: `await mutateAsync({ id: user.id, data: { name: firstname, surname } })`; success toast (default); invalidate `getAuthGetCurrentUserQueryKey()` + `router.refresh()`. Error → destructive toast. Disabled while `isLoading || !user?.id`.

**update-user-billing-details.tsx rules:** `"use client"`; `useTranslations("forms.user-billing")`; `useAuth()` (seed) + `useUserUpdate()` + `useQueryClient` + `useRouter` + `useToast`. `@repo/ui` `Card` + `Button` + `Select` family + `Label`. Fields: `address` (`TextField`), `postalCode`+`city` (2-col grid `TextField`), `country` (`@repo/ui` `Select`, options `COUNTRIES = ["NL","BE","DE"]`, labels `t("countries.<code>")`, placeholder `t("countryPlaceholder")`), `kvk`/`vatNumber` (`TextField`). Seed from `user`. Submit: build `UpdateUserDto` with only non-empty trimmed values; `country` + `vatNumber` `.toUpperCase()`'d; `await mutateAsync({ id: user.id, data })`; success toast (default); invalidate `getAuthGetCurrentUserQueryKey()` + `router.refresh()`. Error → destructive toast. Token-only.

- [ ] **Step 1: Read the boilerplate originals + inventory §1/§6; create the two files** (note the country `@repo/ui` Select + the non-empty payload build + `.toUpperCase()` on country/vatNumber).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): update-user + billing details forms"`.

---

### Task 3: update-avatar

**Files:** Create `src/components/user/update-avatar.tsx`.
**Port from:** `components/user/UpdateAvatar.tsx` (inventory §2).

**Rules:** `"use client"`; `useTranslations("forms.user-avatar")`; `useAuth()` (`user.id`, `user.avatarUrl`, `user.name`); `useFileReplace()` + `useQueryClient` + `useRouter` + `useToast`. `@repo/ui` `Card` family + `Avatar`/`AvatarImage`/`AvatarFallback`. A hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` + a styled `<label>` button. Local `avatarPreview` seeded from `user.avatarUrl`. On pick: validate type (jpeg/png/webp), size ≤ 5 MB, dimensions ≤ 800×800 (via `new Image()`/`URL.createObjectURL`) → destructive toast on failure. Then `await mutateAsync({ scope: "user", ownerId: user.id, folder: "avatar", data: { file } })`; on success set preview = `response.downloadUrl`, invalidate `getAuthGetCurrentUserQueryKey()`, `router.refresh()`, success toast (default). The format/size hint: render a muted `<p>` — if no `forms.user-avatar` hint key exists, add `forms.user-avatar.hint` to en/nl symmetrically (real Dutch) + run the i18n test; else use the existing key. Token-only (Avatar fallback `bg-muted text-muted-foreground`; label button via `Button variant="outline"` or token classes).

- [ ] **Step 1: Read the boilerplate UpdateAvatar + inventory §2; create the file** (use the `@repo/ui` Avatar; `response.downloadUrl`; same upload pattern as the org logo upload from Phase D).
- [ ] **Step 2: Type-check** → PASS (+ i18n test if a hint key was added).
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): update-avatar"`.

---

### Task 4: delete-user

**Files:** Create `src/components/user/delete-user.tsx`.
**Port from:** `components/user/DeleteUser.tsx` (inventory §5).

**Rules:** `"use client"`; `useTranslations` for `forms.user-delete` (card) + `modals.delete` (dialog); `const { user, isLoading, logout } = useAuth()`; `useUserDelete()`. `@repo/ui` `Card` family + `Button variant="destructive"` + `Dialog` family + `Skeleton` + `Alert`. The card shows a destructive Button opening a `Dialog`. Inside: a confirm `TextField` (must type `${user.name} ${user.surname}` to enable the confirm Button), an inline `Alert variant="destructive"` for errors, `useEffect` on `open` resets the input + error. On confirm: `await mutateAsync({ id: user.id })` → `await logout()` (no toast). While `isLoading`, render a `Skeleton` where the button would be. Token-only.

- [ ] **Step 1: Read the boilerplate DeleteUser + inventory §5; create the file** (confirm-by-typing like the Phase D member dialogs; logout on success).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): delete-user"`.

---

### Task 5: Settings pages + tabbed layout

**Files:** Create `(dashboard)/settings/{layout,page}.tsx`, `settings/{account,delete,subscription}/page.tsx`.
**Port from:** the boilerplate settings pages (inventory Part 2).

**Rules:**
- `settings/layout.tsx` (server, async): `getTranslations("pages.settings")`; the app `Header` (title `t("title")`, description `t("description")` if present) + a 4-tab `NavLink` nav (`@repo/ui` nav-link): `/settings` (`exact`) → `t("tabs.personal")`, `/settings/account` → `t("tabs.account")`, `/settings/subscription` → `t("tabs.subscription")`, `/settings/delete` → `t("tabs.delete")`. Then `{children}`. (Mirror `organisation/layout.tsx`.)
- `settings/page.tsx` (server): `<div className="flex flex-col gap-6">` with `<UpdateAvatar />` + `<UpdateUser />` + `<UpdateUserBillingDetails />`. metadata "Settings — Tall & Tiny".
- `settings/account/page.tsx` (server): `<ChangeEmail />` + `<UpdatePassword />`. metadata.
- `settings/delete/page.tsx` (server): `<DeleteUser />`. metadata.
- `settings/subscription/page.tsx` (server, async): a static "coming soon" `@repo/ui` `Card` (lucide `Sparkles`) using `pages.settings.subscription.{title,description,comingSoonTitle,comingSoonDescription}`. Token-only (no `gray-*`).
- Import components from `@/components/user/*`. Token-only.

- [ ] **Step 1: Read the boilerplate settings pages + inventory Part 2; create the six files** (layout mirrors organisation/layout's NavLink tabs).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): settings pages + tabbed layout"`.

---

### Task 6: Build smoke

**Files:** none.

- [ ] **Step 1: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 2: Build** — `pnpm --filter dashboard build` → SUCCESS. Expect new routes: `/settings`, `/settings/account`, `/settings/delete`, `/settings/subscription`. Report the route table.
   A real failure (missing import, type error, token-class issue, RSC/client boundary) must be reported with the exact error; do not delete a component to go green. If a stale-`.next` cache error appears, remove `apps/dashboard/.next` and rebuild.
- [ ] **Step 3:** Record results (verification-only; commit only if a tracked file changed). Run `pnpm --filter @repo/i18n test` if any i18n keys were added during the phase (parity must pass).

---

## Self-Review

**Spec coverage (Phase E slice):** the 6 user forms (Tasks 1–4), `useRoles` (Task 1), settings pages + layout (Task 5), build (Task 6). ✓
**Placeholder scan:** port-and-adapt against named boilerplate files + the per-component inventory, with explicit hook names, DTO shapes, the auth-vs-user endpoint split, `extractErrorMessage` (already in `@repo/queries`), invalidation key, toast/Select/Avatar mappings, logout-on-success behaviour, and token rules — concrete artifacts.
**Type/name consistency:** `UpdateAvatar`/`UpdateUser`/`UpdateUserBillingDetails` (Tasks 2–3) + `ChangeEmail`/`UpdatePassword` (Task 1) + `DeleteUser` (Task 4) consumed by the settings pages (Task 5). `useUserUpdate`/`useUserDelete`/`useAuthChangePassword`/`useAuthRequestEmailChange`/`useFileReplace`/`extractErrorMessage`/`getAuthGetCurrentUserQueryKey` all verified to exist in `@repo/queries`; `useAuth`/`logout` in `@repo/auth`; `Card`/`Dialog`/`Select`/`Avatar`/`Alert`/`Skeleton` in `@repo/ui`. All settings/user i18n namespaces verified present.
**Known adaptation deltas (verified, NOT gaps):** `extractErrorMessage` already exists (do NOT create a lib — inventory was wrong); all i18n namespaces already exist (avatar `hint` is the only possible addition); country `<select>` → `@repo/ui` Select; raw avatar `<img>` → `@repo/ui` Avatar; toast `success` → default; password/delete success → `logout()` (no toast); `response.downloadUrl` (no `.data` wrapper).
**Verification:** check-types per task + the Task 6 build (catches imports, types, token classes, RSC boundaries). Live update/avatar/password/email/delete against the API is best-effort/human.
