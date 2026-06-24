# @repo/ui — Token-Normalized Primitives + Toast + Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the shared `@repo/ui` design-system package with the generic UI primitives the dashboard needs — implemented as canonical shadcn **new-york**, token-based and i18n-free — plus a toast system, a `NavLink`, and two generic hooks.

**Architecture:** `@repo/ui` is a source-only package (`"type": "module"`; `exports` maps `./components/*` → `./src/components/*.tsx`, `./lib/*` → `./src/lib/*.ts`; consumed directly by Next apps, no build step). It already ships token-based `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`. We add ~22 more primitives in the same style, a classic shadcn toast system (`toast` + `use-toast` + `toaster`), a token-based `nav-link`, and `use-click-outside` / `use-date-formatter` hooks. This is Plan 2 of 5 for the dashboard boilerplate port; later plans (`@repo/auth`, `apps/dashboard`) consume these primitives. The boilerplate's app-specific compositions (smart form fields, switchers, app shell) are NOT in scope here.

**Tech Stack:** TypeScript (ESM), React 19, Tailwind v4 (design tokens via CSS variables in `src/styles/globals.css`), the `radix-ui` umbrella package, `class-variance-authority`, `lucide-react`, `embla-carousel-react` (carousel), `vaul` (drawer).

## Global Constraints

These bind **every** component task. A reviewer treats a violation as an Important finding.

- **Reference style:** match the existing `packages/ui/src/components/ui/card.tsx` and `dialog.tsx` — plain function components (not `forwardRef`), `data-slot="<name>"` attributes, `cn(...)` for class merging.
- **Util import:** `import { cn } from "@repo/ui/lib/utils";`
- **Radix imports use the `radix-ui` UMBRELLA**, namespaced, e.g. `import { Accordion as AccordionPrimitive } from "radix-ui";` — NOT individual `@radix-ui/react-*` packages. (Only exception: `Slot` may be imported from the already-installed `@radix-ui/react-slot`, consistent with `button.tsx`.)
- **Sibling component imports** use the self-referential package path, e.g. `import { Button } from "@repo/ui/components/ui/button";` (as `dialog.tsx` does).
- **`"use client";`** at the top of any component using Radix client primitives, React hooks, or browser APIs.
- **TOKEN CLASSES ONLY.** Forbidden: hardcoded Tailwind palette colors (`gray-*`, `slate-*`, `zinc-*`, `neutral-*`, `red-*`, `green-*`, `blue-*`, `yellow-*`, `indigo-*`, etc.). Use only the semantic tokens defined in `packages/ui/src/styles/globals.css`: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, and `radius`. Class examples: `bg-background`, `text-foreground`, `bg-primary text-primary-foreground`, `border-input`, `ring-ring`, `text-muted-foreground`, `bg-accent text-accent-foreground`, `bg-destructive text-destructive-foreground`.
- **No next-intl, no app providers, no app routing assumptions.** Pure presentational primitives. (`nav-link` may use `next/navigation` + `next/link` — that is allowed; it is framework, not app.)
- **Lucide icons** from `lucide-react`.
- **Filenames:** lowercase kebab-case matching the component (`radio-group.tsx`, `aspect-ratio.tsx`). Hooks live in `packages/ui/src/hooks/` as `use-*.ts`.
- **Verification model:** this plan's per-task gate is `pnpm --filter @repo/ui check-types` (no unit tests — these are presentational primitives; the final task adds a build-render smoke). Run package-scoped commands with `pnpm --filter @repo/ui <script>`. Commit after each task; commit scope `(ui)`.
- Node `>=22.12`; package manager `pnpm@10.28.2`.

### Canonical-component spec format

For standard shadcn primitives, each task lists: **file**, **"use client"?**, **radix umbrella primitive(s)** (or none), **lucide icons**, and the **exact exported symbols**. Implement the canonical shadcn **new-york** version of that component, applying the Global Constraints above (umbrella import + `cn` path + token classes + `data-slot`). The exported symbol list is binding — export exactly those names. Full source is given only for the non-shadcn custom files (nav-link, the two hooks).

## File Structure

- `packages/ui/package.json` *(modify)* — add `embla-carousel-react`, `vaul` deps; add `"./hooks/*"` export.
- `packages/ui/src/components/ui/*.tsx` *(create)* — the primitives (one file per component).
- `packages/ui/src/hooks/*.ts` *(create)* — `use-toast.ts`, `use-click-outside.ts`, `use-date-formatter.ts`.
- `apps/web/src/app/ui-demo.tsx` *(modify, final task)* — render a representative set as a build smoke.

---

### Task 1: Package export + simple primitives (badge, skeleton, separator, label, textarea)

**Files:**
- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/components/ui/badge.tsx`, `skeleton.tsx`, `separator.tsx`, `label.tsx`, `textarea.tsx`

**Interfaces — Produces:**
- `badge.tsx` → `Badge`, `badgeVariants`
- `skeleton.tsx` → `Skeleton`
- `separator.tsx` → `Separator`
- `label.tsx` → `Label`
- `textarea.tsx` → `Textarea`

- [ ] **Step 1: Add the hooks export to package.json**

In `packages/ui/package.json`, change the `exports` block from:
```json
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./lib/*": "./src/lib/*.ts",
    "./components/*": "./src/components/*.tsx"
  },
```
to:
```json
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts",
    "./components/*": "./src/components/*.tsx"
  },
```

- [ ] **Step 2: Create the five primitives**

Per the canonical-component spec format:

| File | "use client" | radix umbrella | lucide | Exports |
|---|---|---|---|---|
| `badge.tsx` | no | none (uses `@radix-ui/react-slot` `Slot` for `asChild`, optional — canonical new-york badge) | none | `Badge`, `badgeVariants` |
| `skeleton.tsx` | no | none | none | `Skeleton` |
| `separator.tsx` | yes | `Separator as SeparatorPrimitive` | none | `Separator` |
| `label.tsx` | yes | `Label as LabelPrimitive` | none | `Label` |
| `textarea.tsx` | no | none | none | `Textarea` |

Implement each as the canonical shadcn new-york component, token classes only. (`badge` variants: `default` = `bg-primary text-primary-foreground`, `secondary` = `bg-secondary text-secondary-foreground`, `destructive` = `bg-destructive text-destructive-foreground`, `outline` = `text-foreground` — all token-based.)

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS — no `tsc` errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/package.json packages/ui/src/components/ui/badge.tsx packages/ui/src/components/ui/skeleton.tsx packages/ui/src/components/ui/separator.tsx packages/ui/src/components/ui/label.tsx packages/ui/src/components/ui/textarea.tsx
git commit -m "feat(ui): add badge, skeleton, separator, label, textarea primitives"
```

---

### Task 2: Form-control primitives (checkbox, radio-group, switch, select)

**Files:**
- Create: `packages/ui/src/components/ui/checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `select.tsx`

**Interfaces — Produces:**
- `checkbox.tsx` → `Checkbox`
- `radio-group.tsx` → `RadioGroup`, `RadioGroupItem`
- `switch.tsx` → `Switch`
- `select.tsx` → `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`

- [ ] **Step 1: Create the four primitives**

| File | "use client" | radix umbrella | lucide | Exports |
|---|---|---|---|---|
| `checkbox.tsx` | yes | `Checkbox as CheckboxPrimitive` | `CheckIcon` | `Checkbox` |
| `radio-group.tsx` | yes | `RadioGroup as RadioGroupPrimitive` | `CircleIcon` | `RadioGroup`, `RadioGroupItem` |
| `switch.tsx` | yes | `Switch as SwitchPrimitive` | none | `Switch` |
| `select.tsx` | yes | `Select as SelectPrimitive` | `CheckIcon`, `ChevronDownIcon`, `ChevronUpIcon` | (10 symbols listed above) |

Canonical shadcn new-york, token classes only.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/ui/checkbox.tsx packages/ui/src/components/ui/radio-group.tsx packages/ui/src/components/ui/switch.tsx packages/ui/src/components/ui/select.tsx
git commit -m "feat(ui): add checkbox, radio-group, switch, select primitives"
```

---

### Task 3: Overlay primitives (popover, tooltip, sheet)

**Files:**
- Create: `packages/ui/src/components/ui/popover.tsx`, `tooltip.tsx`, `sheet.tsx`

**Interfaces — Produces:**
- `popover.tsx` → `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`
- `tooltip.tsx` → `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- `sheet.tsx` → `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`

- [ ] **Step 1: Create the three primitives**

| File | "use client" | radix umbrella | lucide | Exports |
|---|---|---|---|---|
| `popover.tsx` | yes | `Popover as PopoverPrimitive` | none | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` |
| `tooltip.tsx` | yes | `Tooltip as TooltipPrimitive` | none | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |
| `sheet.tsx` | yes | `Dialog as SheetPrimitive` | `XIcon` | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` |

Canonical shadcn new-york, token classes only. `sheet.tsx` uses the Radix Dialog primitive with side variants (`top`/`bottom`/`left`/`right`) via `cva`; overlay uses `bg-black/50` (an opacity utility on black, which is allowed — it is not a palette token; canonical shadcn uses it).

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/ui/popover.tsx packages/ui/src/components/ui/tooltip.tsx packages/ui/src/components/ui/sheet.tsx
git commit -m "feat(ui): add popover, tooltip, sheet primitives"
```

---

### Task 4: Disclosure & navigation primitives (accordion, aspect-ratio, tabs, breadcrumb)

**Files:**
- Create: `packages/ui/src/components/ui/accordion.tsx`, `aspect-ratio.tsx`, `tabs.tsx`, `breadcrumb.tsx`

**Interfaces — Produces:**
- `accordion.tsx` → `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `aspect-ratio.tsx` → `AspectRatio`
- `tabs.tsx` → `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `breadcrumb.tsx` → `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`

- [ ] **Step 1: Create the four primitives**

| File | "use client" | radix umbrella | lucide | Exports |
|---|---|---|---|---|
| `accordion.tsx` | yes | `Accordion as AccordionPrimitive` | `ChevronDownIcon` | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `aspect-ratio.tsx` | yes | `AspectRatio as AspectRatioPrimitive` | none | `AspectRatio` |
| `tabs.tsx` | yes | `Tabs as TabsPrimitive` | none | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `breadcrumb.tsx` | no | none (use `Slot` from `@radix-ui/react-slot`) | `ChevronRightIcon`, `MoreHorizontalIcon` | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` |

Canonical shadcn new-york, token classes only.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/ui/accordion.tsx packages/ui/src/components/ui/aspect-ratio.tsx packages/ui/src/components/ui/tabs.tsx packages/ui/src/components/ui/breadcrumb.tsx
git commit -m "feat(ui): add accordion, aspect-ratio, tabs, breadcrumb primitives"
```

---

### Task 5: Data & feedback primitives (avatar, slider, alert, table)

**Files:**
- Create: `packages/ui/src/components/ui/avatar.tsx`, `slider.tsx`, `alert.tsx`, `table.tsx`

**Interfaces — Produces:**
- `avatar.tsx` → `Avatar`, `AvatarImage`, `AvatarFallback`
- `slider.tsx` → `Slider`
- `alert.tsx` → `Alert`, `AlertTitle`, `AlertDescription`
- `table.tsx` → `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`

- [ ] **Step 1: Create the four primitives**

| File | "use client" | radix umbrella | lucide | Exports |
|---|---|---|---|---|
| `avatar.tsx` | yes | `Avatar as AvatarPrimitive` | none | `Avatar`, `AvatarImage`, `AvatarFallback` |
| `slider.tsx` | yes | `Slider as SliderPrimitive` | none | `Slider` |
| `alert.tsx` | no | none | none | `Alert`, `AlertTitle`, `AlertDescription` |
| `table.tsx` | no | none | none | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |

Canonical shadcn new-york, token classes only. `alert` variants: `default` (`bg-card text-card-foreground`) and `destructive` (`text-destructive bg-card` with `*:data-[slot=alert-description]:text-destructive/90`) — token-based; do NOT add success/warning/info variants (no tokens exist for them).

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/ui/avatar.tsx packages/ui/src/components/ui/slider.tsx packages/ui/src/components/ui/alert.tsx packages/ui/src/components/ui/table.tsx
git commit -m "feat(ui): add avatar, slider, alert, table primitives"
```

---

### Task 6: External-dep primitives (carousel, drawer)

**Files:**
- Modify: `packages/ui/package.json`
- Create: `packages/ui/src/components/ui/carousel.tsx`, `drawer.tsx`

**Interfaces — Produces:**
- `carousel.tsx` → `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, and the type `CarouselApi`
- `drawer.tsx` → `Drawer`, `DrawerTrigger`, `DrawerPortal`, `DrawerClose`, `DrawerOverlay`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`

- [ ] **Step 1: Install carousel + drawer deps**

Run:
```bash
pnpm --filter @repo/ui add embla-carousel-react vaul
```
Expected: both added to `packages/ui/package.json` dependencies; lockfile updates.

- [ ] **Step 2: Create the two primitives**

| File | "use client" | external dep | lucide | sibling import | Exports |
|---|---|---|---|---|---|
| `carousel.tsx` | yes | `embla-carousel-react` (`useEmblaCarousel`, `type UseEmblaCarouselType`) | `ArrowLeftIcon`, `ArrowRightIcon` | `Button` from `@repo/ui/components/ui/button` | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, type `CarouselApi` |
| `drawer.tsx` | yes | `vaul` (`Drawer as DrawerPrimitive`) | none | none | `Drawer`, `DrawerTrigger`, `DrawerPortal`, `DrawerClose`, `DrawerOverlay`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription` |

Canonical shadcn new-york, token classes only. (`drawer` overlay uses `bg-black/80`, allowed.)

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/package.json packages/ui/src/components/ui/carousel.tsx packages/ui/src/components/ui/drawer.tsx pnpm-lock.yaml
git commit -m "feat(ui): add carousel (embla) and drawer (vaul) primitives"
```

---

### Task 7: Toast system (toast, use-toast, toaster)

**Files:**
- Create: `packages/ui/src/components/ui/toast.tsx`, `packages/ui/src/hooks/use-toast.ts`, `packages/ui/src/components/ui/toaster.tsx`

**Interfaces — Produces:**
- `toast.tsx` → `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, and the types `ToastProps`, `ToastActionElement`
- `use-toast.ts` → `useToast`, `toast` (the imperative trigger)
- `toaster.tsx` → `Toaster`

**Interfaces — Consumes:** `use-toast.ts` imports the `ToastProps`/`ToastActionElement` types from `@repo/ui/components/ui/toast`; `toaster.tsx` imports the toast components from `@repo/ui/components/ui/toast` and `useToast` from `@repo/ui/hooks/use-toast`.

- [ ] **Step 1: Create `toast.tsx`**

Canonical shadcn new-york **classic** toast (the Radix-toast based one, not sonner). Spec:
- `"use client";`
- `import { Toast as ToastPrimitives } from "radix-ui";`
- `import { XIcon } from "lucide-react";`
- `cva` `toastVariants` with exactly two token-based variants: `default` (`border bg-background text-foreground`) and `destructive` (`destructive group border-destructive bg-destructive text-destructive-foreground`).
- Token classes only.
- Exports: `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, and `type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>`, `type ToastActionElement = React.ReactElement<typeof ToastAction>`.

- [ ] **Step 2: Create `use-toast.ts`**

Canonical shadcn `use-toast` reducer hook (module-level store + listeners), **sound-free** (do NOT add any `new Audio(...)` call). Spec:
- `"use client";`
- `import type { ToastActionElement, ToastProps } from "@repo/ui/components/ui/toast";`
- `const TOAST_LIMIT = 1;` and `const TOAST_REMOVE_DELAY = 1000000;`
- `ToasterToast = ToastProps & { id: string; title?: React.ReactNode; description?: React.ReactNode; action?: ToastActionElement }`.
- Exports `useToast` (returns `{ toasts, toast, dismiss }`) and `toast` (returns `{ id, dismiss, update }`).

- [ ] **Step 3: Create `toaster.tsx`**

Canonical shadcn `toaster`. Spec:
- `"use client";`
- imports `Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport` from `@repo/ui/components/ui/toast` and `useToast` from `@repo/ui/hooks/use-toast`.
- Maps `useToast().toasts` to rendered `<Toast>` elements (with `title`, `description`, `action`, `ToastClose`) inside `ToastProvider` + `ToastViewport`.
- Export: `Toaster`.

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/ui/toast.tsx packages/ui/src/hooks/use-toast.ts packages/ui/src/components/ui/toaster.tsx
git commit -m "feat(ui): add toast system (toast, use-toast, toaster), sound-free"
```

---

### Task 8: NavLink + generic hooks

**Files:**
- Create: `packages/ui/src/components/ui/nav-link.tsx`, `packages/ui/src/hooks/use-click-outside.ts`, `packages/ui/src/hooks/use-date-formatter.ts`

**Interfaces — Produces:**
- `nav-link.tsx` → `NavLink`
- `use-click-outside.ts` → `useClickOutside`
- `use-date-formatter.ts` → `useDateFormatter`

- [ ] **Step 1: Create `nav-link.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { cn } from "@repo/ui/lib/utils";

type NavLinkProps = ComponentProps<typeof Link> & {
  /** When true, only the exact pathname is active (not nested routes). */
  exact?: boolean;
};

function NavLink({ className, href, exact = false, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : (href.pathname ?? "");
  const isActive = exact
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      data-slot="nav-link"
      data-active={isActive ? "true" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { NavLink };
```

- [ ] **Step 2: Create `use-click-outside.ts`**

```ts
import { useEffect } from "react";
import type { RefObject } from "react";

/** Calls `callback` when a mousedown occurs outside the referenced element. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}
```

- [ ] **Step 3: Create `use-date-formatter.ts`**

```ts
import { useMemo } from "react";

/** Formats an ISO date string as `DD-MM-YYYY`. */
export function useDateFormatter(dateString: string): string {
  return useMemo(() => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, [dateString]);
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/ui/nav-link.tsx packages/ui/src/hooks/use-click-outside.ts packages/ui/src/hooks/use-date-formatter.ts
git commit -m "feat(ui): add NavLink and useClickOutside/useDateFormatter hooks"
```

---

### Task 9: Render smoke — demo + web build

**Files:**
- Modify: `apps/web/src/app/ui-demo.tsx`

**Interfaces — Consumes:** the primitives from Tasks 1–8 via `@repo/ui/components/ui/*`.

This task proves the new primitives resolve, type-check, and render through a real Next build (catching token/class and import-resolution issues that `check-types` alone misses).

- [ ] **Step 1: Read the current demo**

Read `apps/web/src/app/ui-demo.tsx` to see its current structure and imports (it already renders existing `@repo/ui` primitives).

- [ ] **Step 2: Extend the demo with a representative set**

Add imports and rendered usages (inside the existing demo's JSX, following its current layout) for a representative cross-section that exercises every dependency path:
- `Badge` (`@repo/ui/components/ui/badge`)
- `Skeleton` (`@repo/ui/components/ui/skeleton`)
- `Alert`, `AlertTitle`, `AlertDescription` (`@repo/ui/components/ui/alert`)
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` (`@repo/ui/components/ui/accordion`)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@repo/ui/components/ui/tabs`)
- `Avatar`, `AvatarFallback` (`@repo/ui/components/ui/avatar`)
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` (`@repo/ui/components/ui/select`)
- `Checkbox` (`@repo/ui/components/ui/checkbox`)
- `Switch` (`@repo/ui/components/ui/switch`)
- `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent` (`@repo/ui/components/ui/tooltip`)
- `Carousel`, `CarouselContent`, `CarouselItem` (`@repo/ui/components/ui/carousel`)
- `NavLink` (`@repo/ui/components/ui/nav-link`)

Render each with minimal valid props (e.g. an `Accordion type="single" collapsible` with one item; a `Select` with two items; a `Tabs` with two tabs). Keep it a flat visual list; this is a smoke screen, not a polished page.

- [ ] **Step 3: Type-check the package and the app**

Run: `pnpm --filter @repo/ui check-types && pnpm --filter web check-types`
Expected: PASS — no `tsc` errors.

- [ ] **Step 4: Build the web app (render smoke)**

Run: `pnpm --filter web build`
Expected: SUCCESS — the Next build completes; the demo page compiles with all new primitives. If the build fails on a missing `@repo/database` generated client (unrelated to these UI changes), run `pnpm --filter @repo/database db:generate` once and retry; a failure tied to a `@repo/ui` primitive is a real failure — report it.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/ui-demo.tsx
git commit -m "test(ui): render-smoke new primitives via web ui-demo build"
```

---

## Self-Review

**Spec coverage (this plan's slice of the design spec):**
- Design spec "→ `@repo/ui`: Primitives (Accordion, AspectRatio, Card*, Carousel, Sheet, Skeleton, Table, Alert, Dialog*, Drawer, Popover, Toast, Tooltip, Tabs, Breadcrumb, Avatar, Badge, inputs: Input*/Select/Checkbox/Radio/Slider/TextArea/Toggle/…, NavLink)" → Tasks 1–6, 8 (Card/Dialog/Input already exist; Toggle = `switch`; Radio = `radio-group`). ✓
- "Toast system (Toast + useToast + Toaster)" → Task 7. ✓
- "Generic hooks: useClickOutside, useDateFormatter" → Task 8. ✓
- "token-normalized + i18n-free" → Global Constraints (token-only, no next-intl), enforced per task by review. ✓
- "render smoke" (design build-order step 2) → Task 9. ✓
- Deliberately excluded (correct per design): `Brand`, `Dashboard`, `Header`, `LanguageSwitcher`, `LogoutButton`, `OrganisationSwitcher`, and the smart form-field compositions (`InputField`, `Password`, `Search`, `Dropdown`, smart `Select`/`Checkbox`/`Radio`/`TextArea`) — these are app-local / `@repo/auth` / Plan 5. ✓

**Placeholder scan:** The custom files (nav-link, both hooks) have complete code. Standard shadcn primitives use the canonical-component spec format (precise path/imports/exports/conventions, not vague "implement a component") — acceptable because the artifact is a deterministic, well-known shadcn new-york component pinned by an exact export list and the Global Constraints. No "TBD"/"add error handling"/"similar to" placeholders.

**Type/name consistency:** Export lists are the binding contract and are referenced consistently (e.g. `Switch` not `Toggle`; `radio-group` exports `RadioGroup`/`RadioGroupItem`; toast types `ToastProps`/`ToastActionElement` produced by `toast.tsx` and consumed by `use-toast.ts`/`toaster.tsx`). The `./hooks/*` export (Task 1) is in place before the first hook consumer (`toaster.tsx`, Task 7). `embla-carousel-react`/`vaul` deps (Task 6) precede their only use (`carousel.tsx`/`drawer.tsx`, same task).

**Scope check:** Single package, one coherent deliverable (the primitive library), 9 reviewable tasks. Good.

**Note for reviewers:** the per-task gate is `check-types`; **token-purity (no hardcoded palette colors) and the exact export list are enforced by the task review reading the diff**, since `check-types` cannot catch a hardcoded color. The final web build (Task 9) is the integration gate.
