"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Menu, Settings, LifeBuoy } from "lucide-react";
import { NavLink } from "@repo/ui/components/ui/nav-link";
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
