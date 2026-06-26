# Dashboard Phase C — Shell + Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the authenticated dashboard shell into `apps/dashboard`: the sidebar/content layout (`Dashboard`), `Header`, `Brand`, `LogoutButton`, `Thumbnail`, `DashboardLinks`, the `LinkedCard`, the `(dashboard)` route-group layout, and the home page — all token-normalized and wired to `@repo/auth`/`@repo/i18n`/`@repo/ui`.

**Architecture:** App-specific shell components live in `apps/dashboard/src/components/`. They consume `@repo/ui` (`NavLink`, `Avatar`, `Card`, `Badge`), `@repo/auth` (`useAuth`, `OrganisationSwitcher`), `@repo/i18n` (`LanguageSwitcher`), and next-intl (`useTranslations`/`getTranslations`). The `(dashboard)` route group provides `/`, so the Phase-A placeholder `src/app/page.tsx` is removed. This is Phase C of Plan 5.

**Tech Stack:** Next 16, React 19, next-intl v4, `@repo/ui`, `@repo/auth`, `@repo/i18n`, lucide-react.

## Global Constraints

- Run all commands from the repo root `/Users/tadeuszderuijter/dev/tintsmith` (`pnpm --filter dashboard <script>`; quote `(dashboard)` paths).
- **Token classes ONLY** — no hardcoded palette colors. The boilerplate originals use `gray-*`/`slate-*`/`white`; the exact code below is already token-normalized (`border-border`, `bg-background`, `bg-muted/40`, `text-foreground`, `text-muted-foreground`, `hover:bg-accent`, `hover:text-accent-foreground`, `hover:ring-ring`, `text-primary`).
- **i18n:** namespaces `navigation.navbar` (`links.dashboard/organisation/settings/support`), `common.buttons` (`logout`), `pages.dashboard` (`title`, `organisationCard*`) — all CONFIRMED present in the catalogs. If any used key is absent, add it symmetrically to en.json + nl.json (real Dutch) and re-run `pnpm --filter @repo/i18n test`.
- Phase gate: `pnpm --filter dashboard check-types` per task + `pnpm --filter dashboard build` (final task).
- Commit after each task; commit scope `(dashboard)`.

## File Structure

- `apps/dashboard/src/components/layout/{brand,logout-button,thumbnail,dashboard-links,dashboard,header}.tsx` *(create)*.
- `apps/dashboard/src/components/cards/linked-card.tsx` *(create)*.
- `apps/dashboard/public/img/logo.jpg` *(copy)*.
- `apps/dashboard/src/app/(dashboard)/layout.tsx`, `page.tsx` *(create)*.
- `apps/dashboard/src/app/page.tsx` *(delete)* — the `(dashboard)` group now owns `/`.

---

### Task 1: Leaf shell components + logo

**Files:**
- Create: `apps/dashboard/src/components/layout/brand.tsx`, `logout-button.tsx`, `thumbnail.tsx`, `dashboard-links.tsx`
- Copy: `apps/dashboard/public/img/logo.jpg`

- [ ] **Step 1: Copy the logo**

```bash
cp "/Users/tadeuszderuijter/dev/boilerplate/nextjs-dashboard-boilerplate/public/img/logo.jpg" apps/dashboard/public/img/logo.jpg
```
(If the source is missing, report it — components still type-check.)

- [ ] **Step 2: Create `brand.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";

type BrandProps = { href: string; className?: string; text?: string };

export function Brand({ href, className, text }: BrandProps) {
  return (
    <Link
      href={href}
      title="Home"
      aria-label="Home"
      className={`flex items-center gap-2.5 ${className ?? ""}`}
    >
      <Image
        src="/img/logo.jpg"
        className="rounded-md"
        alt="Logo"
        width={35}
        height={35}
      />
      {text && <span className="text-sm font-semibold">{text}</span>}
    </Link>
  );
}
```

- [ ] **Step 3: Create `logout-button.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useAuth } from "@repo/auth";

export function LogoutButton() {
  const { logout } = useAuth();
  const t = useTranslations("common.buttons");

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="text-foreground hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors"
    >
      <LogOut className="mr-1.5 size-4" />
      {t("logout")}
    </button>
  );
}
```

- [ ] **Step 4: Create `thumbnail.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useAuth } from "@repo/auth";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/ui/components/ui/avatar";

export function Thumbnail() {
  const { user } = useAuth();

  if (!user?.id) {
    return null;
  }

  return (
    <Link href="/settings">
      <Avatar className="hover:ring-ring size-9 transition-all">
        {user.avatarUrl ? (
          <AvatarImage
            src={user.avatarUrl}
            alt={`avatar picture of ${user.name} ${user.surname}`}
          />
        ) : (
          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
        )}
      </Avatar>
    </Link>
  );
}
```

- [ ] **Step 5: Create `dashboard-links.tsx`**

```tsx
"use client";

import { Home, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavLink } from "@repo/ui/components/ui/nav-link";

export function DashboardLinks() {
  const t = useTranslations("navigation.navbar");

  return (
    <>
      <NavLink href="/" exact className="w-full">
        <Home className="size-4" />
        {t("links.dashboard")}
      </NavLink>
      <NavLink href="/organisation" className="w-full">
        <Building2 className="size-4" />
        {t("links.organisation")}
      </NavLink>
    </>
  );
}
```

- [ ] **Step 6: Type-check** — `pnpm --filter dashboard check-types` → PASS. (Confirms `@repo/ui` `nav-link`/`avatar` exports + `@repo/auth` `useAuth` + `UserResponseDto` `name`/`surname`/`avatarUrl` fields.)
- [ ] **Step 7: Commit** — `git add apps/dashboard/src/components/layout/ apps/dashboard/public/img/logo.jpg`; `git commit -m "feat(dashboard): shell leaf components (Brand, LogoutButton, Thumbnail, DashboardLinks)"`.

---

### Task 2: Dashboard shell + Header

**Files:**
- Create: `apps/dashboard/src/components/layout/dashboard.tsx`, `header.tsx`

**Interfaces — Produces:** `Dashboard`, `DashboardSidebar`, `DashboardNavigation`, `DashboardContent` (from `dashboard.tsx`); `Header` (from `header.tsx`).
**Interfaces — Consumes:** `Brand`, `LogoutButton` (Task 1); `NavLink` (`@repo/ui`); `OrganisationSwitcher` (`@repo/auth`); `LanguageSwitcher` (`@repo/i18n`).

- [ ] **Step 1: Create `dashboard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Menu, Settings, LifeBuoy } from "lucide-react";
import { NavLink } from "@repo/ui/components/ui/nav-link";
import { OrganisationSwitcher } from "@repo/auth";
import { LanguageSwitcher } from "@repo/i18n";
import { Brand } from "./brand";
import { LogoutButton } from "./logout-button";

type DashboardInjectedProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export function Dashboard({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <div className="flex h-screen">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<Partial<DashboardInjectedProps>>,
              { sidebarOpen, setSidebarOpen, toggleSidebar },
            )
          : child,
      )}
    </div>
  );
}

type DashboardSidebarProps = {
  children?: React.ReactNode;
  thumbnail?: React.ReactNode;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  toggleSidebar?: () => void;
};

export function DashboardSidebar({
  children,
  thumbnail,
  sidebarOpen = false,
  toggleSidebar = () => {},
}: DashboardSidebarProps) {
  const t = useTranslations("navigation.navbar");

  return (
    <div
      className={`border-border bg-background fixed left-0 top-0 z-50 h-screen w-full flex-shrink-0 transform border-r p-4 transition-transform duration-300 ease-in-out md:relative md:z-auto md:h-auto md:w-64 md:translate-x-0 md:flex-col ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:static`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="text-muted-foreground hover:text-foreground absolute right-4 top-4 p-2 md:hidden"
      >
        <X className="size-6" />
      </button>

      <div className="mb-3 flex justify-between">
        <Brand href="/" />
        <div className="hidden md:block">{thumbnail}</div>
      </div>

      <div className="mb-4">
        <OrganisationSwitcher />
      </div>

      <nav className="border-border flex-1 space-y-2 border-t pt-4">
        {children}
      </nav>

      <nav className="border-border absolute bottom-0 left-0 w-full space-y-2 border-t p-4">
        <LanguageSwitcher />
        <NavLink href="/settings" className="w-full">
          <Settings className="size-4" />
          {t("links.settings")}
        </NavLink>
        <NavLink href="/support" className="w-full">
          <LifeBuoy className="size-4" />
          {t("links.support")}
        </NavLink>
        <LogoutButton />
      </nav>
    </div>
  );
}

export function DashboardNavigation({
  children,
}: {
  children: React.ReactNode;
}) {
  return <nav className="flex-1 space-y-2">{children}</nav>;
}

export function DashboardContent({
  children,
  toggleSidebar = () => {},
}: {
  children: React.ReactNode;
  toggleSidebar?: () => void;
}) {
  return (
    <main className="bg-muted/40 flex grow flex-col overflow-y-auto">
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute right-4 top-4 md:hidden"
      >
        <Menu className="text-foreground size-6" />
      </button>
      <div>{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Create `header.tsx`**

```tsx
type HeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  border?: boolean;
};

export function Header({ title, description, children, border }: HeaderProps) {
  return (
    <header
      className={`flex items-center ${border ? "border-border border-b pb-4" : ""}`}
    >
      <div className="space-y-2">
        <h1 className="font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="ml-auto space-x-2">{children}</div>
    </header>
  );
}
```

- [ ] **Step 3: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(dashboard): Dashboard shell + Header"`.

---

### Task 3: LinkedCard + (dashboard) layout + home page

**Files:**
- Create: `apps/dashboard/src/components/cards/linked-card.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/layout.tsx`, `apps/dashboard/src/app/(dashboard)/page.tsx`
- Delete: `apps/dashboard/src/app/page.tsx`

- [ ] **Step 1: Create `linked-card.tsx`**

```tsx
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";

type LinkedCardProps = {
  title: string;
  description: string;
  badge: string;
  button: string;
  href: string;
};

export function LinkedCard({
  title,
  description,
  badge,
  button,
  href,
}: LinkedCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary">{badge}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>{description}</CardContent>
        <CardFooter>
          <div className="text-primary flex items-center gap-1 font-semibold">
            <span>{button}</span>
            <ChevronRightIcon className="size-4" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Delete the Phase-A placeholder home**

```bash
git rm apps/dashboard/src/app/page.tsx
```
(The `(dashboard)` route group now owns `/`. Two `/` pages would be a build error.)

- [ ] **Step 3: Create the `(dashboard)` layout**

`apps/dashboard/src/app/(dashboard)/layout.tsx`:
```tsx
import {
  Dashboard,
  DashboardSidebar,
  DashboardNavigation,
  DashboardContent,
} from "@/components/layout/dashboard";
import { DashboardLinks } from "@/components/layout/dashboard-links";
import { Thumbnail } from "@/components/layout/thumbnail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Dashboard>
      <DashboardSidebar thumbnail={<Thumbnail />}>
        <DashboardNavigation>
          <DashboardLinks />
        </DashboardNavigation>
      </DashboardSidebar>
      <DashboardContent>{children}</DashboardContent>
    </Dashboard>
  );
}
```

- [ ] **Step 4: Create the home page**

`apps/dashboard/src/app/(dashboard)/page.tsx`:
```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { LinkedCard } from "@/components/cards/linked-card";

export const metadata: Metadata = { title: "Dashboard — Tall & Tiny" };

export default async function DashboardHomePage() {
  const t = await getTranslations("pages.dashboard");

  return (
    <div className="space-y-6 p-4 md:p-12">
      <Header border title={t("title")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LinkedCard
          title={t("organisationCardTitle")}
          description={t("organisationCardDescription")}
          button={t("organisationCardButton")}
          href="/organisation"
          badge={t("organisationCardBadge")}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check** — `pnpm --filter dashboard check-types` → PASS. (No remaining import of `@/app/page` or the deleted placeholder.)
- [ ] **Step 6: Commit** — `git add` the new files + the deletion; `git commit -m "feat(dashboard): LinkedCard + (dashboard) layout + home page"`.

---

### Task 4: Build smoke

**Files:** none.

- [ ] **Step 1: Type-check** — `pnpm --filter dashboard check-types` → PASS.
- [ ] **Step 2: Build** — `pnpm --filter dashboard build` → SUCCESS. The home `/` route now renders the `(dashboard)` shell (it reads cookies/auth at runtime via the providers, so it may be dynamic — expected). Confirm there is exactly ONE `/` route (no conflict from the deleted `src/app/page.tsx`). Report the route table.
   A real failure (duplicate `/` route, missing import, type error, token-class issue, a client/server boundary mistake in the shell) must be reported with the exact error; do not delete a component to go green.
- [ ] **Step 3:** Record results (verification-only; commit only if a tracked file changed).

---

## Self-Review

**Spec coverage (Phase C slice):** `(dashboard)` layout + shell (`Dashboard`/`Header`/`DashboardLinks`/`Brand`/`LogoutButton`/`Thumbnail`) (Tasks 1–3); home page (Task 3); `logo.jpg` (Task 1); `LinkedCard` (pulled into Phase C because the home page needs it — Task 3); build gate (Task 4). ✓
**Placeholder scan:** every component is exact, token-normalized code. The `src/app/page.tsx` deletion is required (route-group `/` conflict), not a placeholder gap.
**Type/name consistency:** `Dashboard`/`DashboardSidebar`/`DashboardNavigation`/`DashboardContent` (Task 2) consumed by the `(dashboard)` layout (Task 3); `Brand`/`LogoutButton` (Task 1) by `dashboard.tsx` (Task 2); `Thumbnail`/`DashboardLinks` (Task 1) by the layout (Task 3); `NavLink`/`Avatar`/`Card`/`Badge` (`@repo/ui`), `useAuth`/`OrganisationSwitcher` (`@repo/auth`), `LanguageSwitcher` (`@repo/i18n`) — all verified against the produced package APIs. `Badge variant="secondary"` (the boilerplate's `"gray"` has no token equivalent).
**Verification:** check-types per task + the Task 4 build (catches the `/` route conflict, imports, RSC/client boundaries, token classes). Live navigation (sidebar, logout, org switch) is best-effort/human against the running stack.
**Reviewer note:** the `Dashboard` uses the boilerplate's `React.cloneElement` prop-injection to share sidebar state with `DashboardContent` — ported faithfully; reviewers should verify token purity + correct shared-package imports rather than re-architecting the cloneElement pattern.
