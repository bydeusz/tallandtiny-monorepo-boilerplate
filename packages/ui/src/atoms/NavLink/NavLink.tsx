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
