"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Plus } from "lucide-react";

import {
  useOrganisationList,
  extractOrganisationList,
  type OrganisationListParams,
} from "@repo/queries";
import { useAuth } from "./auth-provider";
import { useOrganisation } from "./organisation-provider";

const LIST_PARAMS = {
  page: 1,
  limit: 100,
} as unknown as OrganisationListParams;

function OrgThumb({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (logoUrl) {
    return (
      <span className="relative mr-1 size-6 shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned URLs from arbitrary storage hosts */}
        <img
          src={logoUrl}
          alt=""
          width={32}
          height={32}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-border"
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function OrganisationSwitcher() {
  const t = useTranslations("navigation.organisation");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedOrganisationId, setSelectedOrganisationId, selectionSynced } =
    useOrganisation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: listResponse, isLoading: listLoading } = useOrganisationList(
    LIST_PARAMS,
    { query: { enabled: isAuthenticated && !authLoading } },
  );

  const organisations = useMemo(
    () => extractOrganisationList(listResponse),
    [listResponse],
  );

  const selected = useMemo(
    () => organisations.find((o) => o.id === selectedOrganisationId) ?? null,
    [organisations, selectedOrganisationId],
  );

  useEffect(() => {
    if (!selectionSynced || !isAuthenticated || authLoading || listLoading) {
      return;
    }
    if (organisations.length === 0) {
      return;
    }
    if (
      selectedOrganisationId &&
      organisations.some((o) => o.id === selectedOrganisationId)
    ) {
      return;
    }
    if (selectedOrganisationId && user?.organisationIds.length) {
      const stillMember = user.organisationIds.includes(selectedOrganisationId);
      if (!stillMember) {
        setSelectedOrganisationId(organisations[0]?.id ?? null);
        return;
      }
    }
    if (!selectedOrganisationId) {
      setSelectedOrganisationId(organisations[0]?.id ?? null);
    }
  }, [
    authLoading,
    isAuthenticated,
    listLoading,
    organisations,
    selectedOrganisationId,
    selectionSynced,
    setSelectedOrganisationId,
    user?.organisationIds,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || authLoading) {
    return null;
  }

  const showPlaceholder = listLoading && organisations.length === 0;

  if (!listLoading && organisations.length === 0) {
    return (
      <div className="text-xs">
        <Link
          href="/organisation/new"
          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-center text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">{t("addOrganisation")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative text-xs" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={listLoading && organisations.length === 0}
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md py-2.5 pl-3 pr-10 text-left text-foreground ring-1 ring-inset ring-input hover:ring-ring disabled:cursor-wait disabled:opacity-70"
      >
        {showPlaceholder ? (
          <span className="truncate text-muted-foreground">{t("loading")}</span>
        ) : selected ? (
          <>
            <OrgThumb name={selected.name} logoUrl={selected.logoUrl} />
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="truncate text-muted-foreground">{t("placeholder")}</span>
        )}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown
            className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {isOpen && organisations.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
          {organisations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setSelectedOrganisationId(org.id);
                setIsOpen(false);
              }}
              className={`flex w-full min-w-0 cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${
                org.id === selectedOrganisationId ? "bg-accent/50" : ""
              }`}
            >
              <OrgThumb name={org.name} logoUrl={org.logoUrl} />
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
            </button>
          ))}
          <div className="border-t p-2">
            <Link
              href="/organisation/new"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-center text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsOpen(false)}
            >
              <Plus className="size-4 shrink-0" />
              {t("addOrganisation")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
