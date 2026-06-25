# Dashboard Phase D — Organisation Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the organisation feature into `apps/dashboard`: member dialogs (change-role, remove, invite), the logo upload, create/update organisation forms, the team list, the organisation-branding shell, and the organisation pages/layout — adapted to the shared packages.

**Architecture:** App-specific organisation components live under `apps/dashboard/src/components/organisation/` (+ `forms/` for `create-organisation-form`, `lists/` for `team-list`). They consume `@repo/queries` (organisation + member + file mutations/queries + helpers + query-key helpers), `@repo/auth` (`useAuth`/`useOrganisation`/`useOrganisationOwnership`), `@repo/ui` (Dialog, Select, Table, Card, Alert, Avatar, Badge, Skeleton, Button + the app `TextField`), `@repo/ui/hooks/use-toast`, and next-intl. This is Phase D of Plan 5 (the heaviest phase). The detailed per-component digest is in `.superpowers/sdd/phased-inventory.md`.

**Tech Stack:** Next 16, React 19, TanStack Query v5, next-intl v4, `@repo/ui`, `@repo/queries`, `@repo/auth`.

## Global Constraints (shared adaptation rules — apply to every component)

- Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (`pnpm --filter dashboard <script>`; quote `(dashboard)` paths).
- **Port-and-adapt:** read the named boilerplate file under `/Users/tadeuszderuijter/dev/boilerplate/nextjs-dashboard-boilerplate/src/` AND the matching section of `.superpowers/sdd/phased-inventory.md`; reproduce the behaviour with the monorepo's shared pieces + tokens. Do NOT copy hardcoded colors or the boilerplate smart inputs.
- **Smart inputs:** the boilerplate `InputField` → the app `TextField` (`@/components/forms/text-field`). The boilerplate `SelectInput` (role select) → `@repo/ui/components/ui/select` primitives (`Select`,`SelectTrigger`,`SelectValue`,`SelectContent`,`SelectItem`). The boilerplate `SearchInput` → `@repo/ui` `Input` + a lucide `Search` icon (app-inline).
- **Confirmed `@repo/queries` hooks** (exact): `useOrganisationCreate` (`{ data }`), `useOrganisationList` (query `(params, opts)`), `useOrganisationGet` (query `(id, opts)` → returns `OrganisationResponseDto` directly), `useOrganisationUpdate` (`{ id, data }`), `useOrganisationMemberList` (query `(id, params, opts)`), `useOrganisationMemberInvite` (`{ id, data }`), `useOrganisationMemberUpdateRole` (`{ id, userId, data }`), `useOrganisationMemberRemove` (`{ id, userId }`), `useFileReplace` (`{ scope:'organisation', ownerId, folder:'logo', data:{ file } }` → `FileResponseDto` with `.downloadUrl`). Query-key helpers for invalidation: `getOrganisationGetQueryKey(id)`, `getOrganisationListQueryKey(params)`, `getOrganisationMemberListQueryKey(id, params?)`.
- **Helpers (monorepo names, NOT the boilerplate `*FromResponse` names):** `extractMemberList`, `extractMemberListMeta`, `extractOrganisationList`, `extractErrorMessage` from `@repo/queries`. Single-org get and create/update return the DTO directly — NO unwrap helper.
- **Toast:** `useToast`/`toast` from `@repo/ui/hooks/use-toast`. **Our toast `cva` has only `default` + `destructive` variants** — the boilerplate's `variant: "success"` toasts become the DEFAULT variant (omit `variant`); keep `variant: "destructive"` for errors.
- **Badge:** `@repo/ui` Badge has `default`/`secondary`/`destructive`/`outline` only. Map the boilerplate role/status badges to these: OWNER → `default`, MEMBER → `secondary`, active → `default`, pending → `outline`. Do NOT add new Badge variants.
- **`@repo/auth`:** `useAuth()`, `useOrganisation()`, `useOrganisationOwnership(id)`.
- **Token classes ONLY** — replace boilerplate palette colors per the inventory's color map (`text-gray-500/600`→`text-muted-foreground`, `text-gray-700`→`text-foreground`, `bg-gray-100/200`→`bg-muted`, `ring-gray-*`→`ring-border`, `border-gray-100`→`border-border`, `placeholder:text-gray-400`→`placeholder:text-muted-foreground`, `text-red-600`→`text-destructive`, drop `bg-white` on rows).
- **i18n:** namespaces are all present in `@repo/i18n` (`pages.organisation`, `forms.createOrganisation`, `forms.organisation-settings`, `modals.{inviteMember,removeMember,changeRole}`, `tables.team`, `navigation.navbar`). If a SPECIFIC key your adapted component references is absent, add it to BOTH `packages/i18n/src/messages/{en,nl}.json` symmetrically (real Dutch), then run `pnpm --filter @repo/i18n test` (parity must pass) — report any addition.
- Phase gate: `pnpm --filter dashboard check-types` per task + `pnpm --filter dashboard build` (final task). Live CRUD against the API is best-effort/human.
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/src/components/organisation/{change-member-role-dialog,remove-member-dialog,invite-member-dialog,organisation-logo-upload,update-organisation,update-organisation-branding}.tsx` *(create)*.
- `apps/dashboard/src/components/forms/create-organisation-form.tsx` *(create)*.
- `apps/dashboard/src/components/lists/team-list.tsx` *(create)*.
- `apps/dashboard/src/app/(dashboard)/organisation/{layout,page}.tsx`, `organisation/branding/page.tsx`, `organisation/team/page.tsx`, `organisation/new/{page,ui}.tsx` *(create)*.

---

### Task 1: Change-role + Remove member dialogs

**Files:** Create `change-member-role-dialog.tsx`, `remove-member-dialog.tsx` in `src/components/organisation/`.
**Port from:** `components/organisation/ChangeMemberRoleDialog.tsx`, `RemoveMemberDialog.tsx` (inventory §1, §3).

Both share a **confirm-by-typing** pattern: the user must type the member's full name before the destructive/role action enables.

**change-member-role-dialog.tsx rules:**
- `"use client"`; props `{ member: OrganisationMemberResponseDto; organisationId: string; disabled?: boolean }`; `useTranslations("modals.changeRole")`.
- `useOrganisationMemberUpdateRole()` + `useQueryClient()`. Action: if `member.role === OrganisationRole.OWNER` → demote (nextRole = `MEMBER`); else promote (nextRole = `OWNER`). Use the `promote.*` / `demote.*` i18n keys accordingly.
- Trigger: icon `Button` (`ShieldCheck` from lucide), `disabled` from prop. Dialog (`@repo/ui` Dialog family). Confirm input: `TextField` — submit `Button` enabled only when the typed value === the member's full name (`${user.name} ${user.surname}`).
- On submit: `await mutateAsync({ id: organisationId, userId: member.userId, data: { role: nextRole } })`; `queryClient.invalidateQueries({ queryKey: getOrganisationMemberListQueryKey(organisationId) })`; close dialog. On error: `extractErrorMessage` → inline `Alert variant="destructive"` (`AlertTitle` = `t("errorTitle")`). Token-only.

**remove-member-dialog.tsx rules:**
- `"use client"`; props `{ member; organisationId; disabled? }`; `useTranslations("modals.removeMember")`.
- `useOrganisationMemberRemove()` + `useQueryClient()`. Trigger: icon `Button variant="destructive"` (`Trash2`). Confirm-by-typing full name. On submit: `await mutateAsync({ id: organisationId, userId: member.userId })`; invalidate member list; close. Error → inline `Alert variant="destructive"`. Token-only.

- [ ] **Step 1: Read both boilerplate dialogs + inventory §1/§3; create the two files** per the rules.
- [ ] **Step 2: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): change-role + remove member dialogs"`.

---

### Task 2: Invite member dialog

**Files:** Create `invite-member-dialog.tsx` in `src/components/organisation/`.
**Port from:** `components/organisation/InviteMemberDialog.tsx` (inventory §2).

**Rules:**
- `"use client"`; props `{ organisationId: string }`; `useTranslations("modals.inviteMember")`.
- `useOrganisationMemberInvite()` + `useQueryClient()` + `useToast` (`toast` from `@repo/ui/hooks/use-toast`).
- Trigger: `Button` with `UserPlus` icon + `t("button")`. Dialog form: email (`TextField`, required), firstname + surname (`TextField`, optional — only added to the payload if non-empty), role select via `@repo/ui` `Select` (`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`; options `t("roleMember")`/`t("roleOwner")`, values `OrganisationRole.MEMBER`/`OWNER`, default `MEMBER`).
- On submit: build `InviteMemberDto` = `{ email, role, ...(name? {name}), ...(surname? {surname}) }`; `await mutateAsync({ id: organisationId, data })`; invalidate member list; `toast({ title: t("successTitle"), description: t("successDescription") })` (DEFAULT variant — our toast has no success variant); reset fields; close. Error → inline `Alert variant="destructive"`. Token-only.

- [ ] **Step 1: Read the boilerplate InviteMemberDialog + inventory §2; create the file** (note the optional-field payload building + the `@repo/ui` Select for the role + the success toast mapped to the default variant).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): invite member dialog"`.

---

### Task 3: Organisation logo upload

**Files:** Create `organisation-logo-upload.tsx` in `src/components/organisation/`.
**Port from:** `components/organisation/OrganisationLogoUpload.tsx` (inventory §4).

**Rules:**
- `"use client"`; props `{ organisationId: string; name: string; logoUrl: string | null; canEdit: boolean }`; `useTranslations("forms.organisation-settings")`.
- `useFileReplace()` + `useQueryClient()` + `useRouter()` + `useToast`.
- `@repo/ui` `Card` family (`Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`). A preview (current `logoUrl` via `next/image` or an `<img>`, else an initial-letter placeholder `<div>` token-styled). A hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml">` with a `<label>` styled as a `Button` (only when `canEdit`).
- On file pick: validate type (the four accepted MIME types → else `toast({ variant: "destructive", title: t("errorTitle"), description: t("logoInvalidType") })`); validate size ≤ 5 MB (→ `t("logoTooLarge")`). Then `await mutateAsync({ scope: "organisation", ownerId: organisationId, folder: "logo", data: { file } })`. On success: read `response.downloadUrl` to update the local preview; invalidate `getOrganisationGetQueryKey(organisationId)` + `getOrganisationListQueryKey({ page: 1, limit: 100 })`; `router.refresh()`; `toast({ title: t("successTitle"), description: t("successMessage") })` (default variant). On API error: `toast({ variant: "destructive", title: t("errorTitle"), description: t("errorMessage") })`.
- Token-only (replace all `gray-*`).

- [ ] **Step 1: Read the boilerplate OrganisationLogoUpload + inventory §4; create the file** (use `useFileReplace`, `response.downloadUrl` directly — the monorepo unwraps the envelope; `Card` from `@repo/ui`; token-normalize).
- [ ] **Step 2: Type-check** → PASS. (Confirm `useFileReplace` variables shape + `FileResponseDto.downloadUrl`.)
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): organisation logo upload"`.

---

### Task 4: Create-organisation form

**Files:** Create `create-organisation-form.tsx` in `src/components/forms/`.
**Port from:** `components/forms/CreateOrganisationForm.tsx` (inventory §8).

**Rules:**
- `"use client"`; `useTranslations("forms.createOrganisation")`; `useRouter`; `useOrganisation()` (for `setSelectedOrganisationId`).
- `useOrganisationCreate()` + `useQueryClient()` + `useToast`.
- `@repo/ui` `Card` family + `Button`. Fields via `TextField`: name (required), address (required), postalCode (required), city (required), kvk/vatNumber/iban (optional). Layout: postalCode + city in a 2-col grid.
- On submit: build `CreateOrganisationDto` (optional fields only if non-empty); `const created = await mutateAsync({ data })` (returns `OrganisationResponseDto` directly — no unwrap); invalidate `getOrganisationListQueryKey({ page: 1, limit: 100 })`; `setSelectedOrganisationId(created.id)`; `toast({ title: t("successTitle"), description: t("success") })` (default variant); `router.push("/organisation")`; `router.refresh()`. Error → `toast({ variant: "destructive", title: t("errorTitle"), description: t("error") })`. Cancel button → `router.push("/organisation")`. Token-only.

- [ ] **Step 1: Read the boilerplate CreateOrganisationForm + inventory §8; create the file.**
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): create-organisation form"`.

---

### Task 5: Team list

**Files:** Create `team-list.tsx` in `src/components/lists/`.
**Port from:** `components/Lists/TeamList.tsx` (inventory §7).
**Consumes:** the 3 dialogs (Tasks 1–2).

**Rules:**
- `"use client"`; `useTranslations` for `tables.team` (+ `navigation.navbar` for the search placeholder via `t("search")`).
- `useAuth()` (for `user.id`), `useOrganisation()` (for `selectedOrganisationId`), `useOrganisationMemberList(selectedOrganisationId ?? "", { page: 1, limit: 100 }, { query: { enabled: Boolean(selectedOrganisationId) } })`.
- Helpers: `extractMemberList(data)` + `extractMemberListMeta(data)`.
- `@repo/ui` `Table` family, `Avatar`/`AvatarImage`/`AvatarFallback`, `Badge`, `Skeleton`, `Input` (+ lucide `Search` icon for the search box).
- Compute: `ownerCount`, `currentMembership` (by `user.id`), `isOwner`, `filteredMembers` (client-side search on name/email). Header: search `Input` + (if `isOwner`) `<InviteMemberDialog organisationId={selectedOrganisationId} />`. Each row: Avatar + full name, email, role `Badge` (OWNER→`default`, MEMBER→`secondary`), status `Badge` (`user.isActive` → `default` "active" else `outline` "pending"), actions = `<ChangeMemberRoleDialog>` + `<RemoveMemberDialog>` with `disabled={!isOwner || isLastOwner}` where `isLastOwner = member.role===OWNER && ownerCount===1`.
- States: skeleton rows while loading; error row (`t("loadError")`); empty row (`t("empty")`); "select org first" (`t("selectOrgFirst")`) when no `selectedOrganisationId`; truncation hint (`t("truncationHint")`) when `meta.total > rendered`.
- Token-only (drop `bg-white`, map grays).

- [ ] **Step 1: Read the boilerplate TeamList + inventory §7; create the file** (Badge variants mapped per the rules; search via `Input` + icon; embed the 3 dialogs).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): team list with member table + dialogs"`.

---

### Task 6: Update-organisation form

**Files:** Create `update-organisation.tsx` in `src/components/organisation/`.
**Port from:** `components/organisation/UpdateOrganisation.tsx` (inventory §5).
**Consumes:** `CreateOrganisationForm` (Task 4, for the no-org fallback).

**Rules:**
- `"use client"`; `useTranslations("forms.organisation-settings")`; `useRouter`; `useSearchParams`.
- `useAuth()` (for `user.organisationIds`), `useOrganisation()` (`selectedOrganisationId` + `setSelectedOrganisationId`), `useOrganisationOwnership(selectedOrganisationId)` (for `isOwner`).
- `useOrganisationGet(selectedOrganisationId ?? "", { query: { enabled: Boolean(selectedOrganisationId) } })` (returns `OrganisationResponseDto` directly), `useOrganisationUpdate()` + `useQueryClient()` + `useToast`.
- `@repo/ui` `Card` family + `Button`; fields via `TextField` (name required; address; postalCode+city grid; kvk/vatNumber/iban optional). Form disabled when `!isOwner`.
- `?org=` deep-link: on mount read `searchParams.get("org")`; if present and in `user.organisationIds`, `setSelectedOrganisationId(it)`.
- Conditional render: if `!selectedOrganisationId` → `<CreateOrganisationForm />`; if loading → `t("loading")`; if error/no org → `t("errorLoad")`.
- On submit: build `UpdateOrganisationDto` (optional fields only if non-empty); `await mutateAsync({ id, data })`; invalidate `getOrganisationGetQueryKey(id)` + `getOrganisationListQueryKey({page:1,limit:100})`; `toast({ title: t("successTitle"), description: t("successMessage") })`; `router.refresh()`. Error → `toast({ variant: "destructive", ... })`. Token-only.

- [ ] **Step 1: Read the boilerplate UpdateOrganisation + inventory §5; create the file.**
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): update-organisation form"`.

---

### Task 7: Update-organisation-branding

**Files:** Create `update-organisation-branding.tsx` in `src/components/organisation/`.
**Port from:** `components/organisation/UpdateOrganisationBranding.tsx` (inventory §6).
**Consumes:** `OrganisationLogoUpload` (Task 3), `CreateOrganisationForm` (Task 4).

**Rules:**
- `"use client"`; `useTranslations("forms.organisation-settings")`; `useSearchParams`.
- `useAuth()`, `useOrganisation()`, `useOrganisationOwnership(selectedOrganisationId)`, `useOrganisationGet(selectedOrganisationId ?? "", { query: { enabled: Boolean(selectedOrganisationId) } })`.
- Same `?org=` deep-link logic as Task 6. Fallback to `<CreateOrganisationForm />` when no org. Loading → `t("loading")`; error → `t("errorLoad")`.
- Renders `<OrganisationLogoUpload organisationId={org.id} name={org.name} logoUrl={org.logoUrl} canEdit={isOwner} />`.
- Token-only.

- [ ] **Step 1: Read the boilerplate UpdateOrganisationBranding + inventory §6; create the file.**
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): update-organisation-branding shell"`.

---

### Task 8: Organisation pages + layout

**Files:** Create `(dashboard)/organisation/{layout,page}.tsx`, `organisation/branding/page.tsx`, `organisation/team/page.tsx`, `organisation/new/{page,ui}.tsx`.
**Port from:** the matching boilerplate pages (inventory Part 2).

**Rules:**
- `organisation/layout.tsx` (server, async): `getTranslations("pages.organisation")`; a padded container with the app `Header` (title `t("title")`, description `t("description")`) and a 3-tab nav. Use `@repo/ui` `NavLink` for the tabs (`/organisation` details, `/organisation/branding` branding, `/organisation/team` team) with `t("tabs.details/branding/team")` — `exact` on `/organisation`. Wraps `{children}`.
- `organisation/page.tsx` (server): renders `<UpdateOrganisation />` inside `<Suspense fallback={null}>` (it uses `useSearchParams`). 
- `organisation/branding/page.tsx` (server): `<UpdateOrganisationBranding />` in `<Suspense fallback={null}>`.
- `organisation/team/page.tsx` (server): `<TeamList />` (no Suspense needed).
- `organisation/new/page.tsx` (server): metadata + renders the client shell `<CreateOrganisationPageClient />` from `./ui`.
- `organisation/new/ui.tsx` (`"use client"`): `useAuth()` loading guard (`t("loading")` from `forms.createOrganisation`) → then `<CreateOrganisationForm />`. Export `CreateOrganisationPageClient`.
- Import components from `@/components/...`. Token-only.

- [ ] **Step 1: Read the boilerplate organisation pages + inventory Part 2; create the six files** (note: `page.tsx` and `branding/page.tsx` wrap their client component in `<Suspense>` because of `useSearchParams`).
- [ ] **Step 2: Type-check** → PASS.
- [ ] **Step 3: Commit** — `git commit -m "feat(dashboard): organisation pages + tabbed layout"`.

---

### Task 9: Build smoke

**Files:** none.

- [ ] **Step 1: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 2: Build** — `pnpm --filter dashboard build` → SUCCESS. Expect new routes: `/organisation`, `/organisation/branding`, `/organisation/team`, `/organisation/new` (dynamic where they read auth/searchParams). Report the route table.
   A real failure (missing import, type error, a `useSearchParams` not wrapped in Suspense → build error, token-class issue) must be reported with the exact error; do not delete a component to go green. If a stale-`.next` cache error appears, remove `apps/dashboard/.next` and rebuild.
- [ ] **Step 3:** Record results (verification-only; commit only if a tracked file changed). Also run `pnpm --filter @repo/i18n test` if any i18n keys were added during the phase (parity must pass).

---

## Self-Review

**Spec coverage (Phase D slice):** the 3 member dialogs (Tasks 1–2), logo upload (Task 3), create form (Task 4), team list (Task 5), update form (Task 6), branding shell (Task 7), pages + layout (Task 8), build (Task 9). `useRoles` is NOT part of this feature (it is job-roles, used by user settings — Phase E). ✓
**Placeholder scan:** the components are port-and-adapt against named boilerplate files + the per-component inventory, with explicit hook names, DTO shapes, helper names, i18n namespaces, Badge/toast/Select mappings, and token rules — concrete artifacts, not vague directives.
**Type/name consistency:** the dialogs (Tasks 1–2) are consumed by TeamList (Task 5); `CreateOrganisationForm` (Task 4) by UpdateOrganisation (Task 6) + branding (Task 7) + the new page (Task 8); `OrganisationLogoUpload` (Task 3) by branding (Task 7); all `@repo/queries`/`@repo/auth`/`@repo/ui` names verified in the inventory (Part 0) against the generated source.
**Known adaptation deltas (verified, NOT gaps):** `Card`/`Alert` already exist in `@repo/ui`; all org i18n namespaces already exist; Badge maps to existing variants (no new variants); toast `success` → default variant; helper names are the monorepo `extract*` (not `*FromResponse`); single-org get/create/update return the DTO directly.
**Verification:** check-types per task + the Task 9 build (catches imports, types, the Suspense-around-useSearchParams requirement, token classes). Live member invite/role/remove + logo upload + org CRUD against the API is best-effort/human.
