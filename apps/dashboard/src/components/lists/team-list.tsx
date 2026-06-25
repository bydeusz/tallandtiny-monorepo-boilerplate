"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { useAuth, useOrganisation } from "@repo/auth";
import {
  useOrganisationMemberList,
  extractMemberList,
  extractMemberListMeta,
  OrganisationRole,
} from "@repo/queries";
import type { OrganisationMemberListParams } from "@repo/queries";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";

import { ChangeMemberRoleDialog } from "@/components/organisation/change-member-role-dialog";
import { InviteMemberDialog } from "@/components/organisation/invite-member-dialog";
import { RemoveMemberDialog } from "@/components/organisation/remove-member-dialog";

// TODO: replace with proper pagination (useInfiniteQuery + load-more) once
// teams larger than this become a real use case. Until then we surface a
// truncation hint when meta.total exceeds what's rendered.
const MEMBER_PAGE_LIMIT = 100;
const LIST_PARAMS = {
  page: 1,
  limit: MEMBER_PAGE_LIMIT,
} as unknown as OrganisationMemberListParams;

export function TeamList() {
  const { user } = useAuth();
  const navT = useTranslations("navigation.navbar");
  const teamT = useTranslations("tables.team");

  const { selectedOrganisationId } = useOrganisation();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data,
    isLoading,
    isError,
  } = useOrganisationMemberList(selectedOrganisationId ?? "", LIST_PARAMS, {
    query: { enabled: Boolean(selectedOrganisationId) },
  });

  const members = useMemo(() => extractMemberList(data), [data]);
  const meta = useMemo(() => extractMemberListMeta(data), [data]);

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === OrganisationRole.OWNER).length,
    [members],
  );

  const currentMembership = useMemo(
    () => members.find((m) => m.userId === user?.id) ?? null,
    [members, user?.id],
  );
  const isOwner = currentMembership?.role === OrganisationRole.OWNER;

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => {
      const fullName = `${m.user.name} ${m.user.surname}`.trim().toLowerCase();
      return fullName.includes(q) || m.user.email.toLowerCase().includes(q);
    });
  }, [members, searchQuery]);

  if (!selectedOrganisationId) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {teamT("selectOrgFirst")}
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between space-x-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            id="search"
            type="search"
            placeholder={navT("search")}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {isOwner && (
          <InviteMemberDialog organisationId={selectedOrganisationId} />
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{teamT("name")}</TableHead>
              <TableHead>{teamT("email")}</TableHead>
              <TableHead>{teamT("role")}</TableHead>
              <TableHead>{teamT("status")}</TableHead>
              <TableHead className="text-right">{teamT("settings")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell className="py-3">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-[120px]" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-3 w-[140px]" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-[60px]" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-[80px]" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-destructive">
                  {teamT("loadError")}
                </TableCell>
              </TableRow>
            ) : filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-muted-foreground">
                  {teamT("empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => {
                const fullName =
                  `${member.user.name} ${member.user.surname}`.trim();
                const memberIsOwner = member.role === OrganisationRole.OWNER;
                const isLastOwner = memberIsOwner && ownerCount <= 1;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-4">
                        <Avatar className="size-10">
                          <AvatarImage src={member.user.avatarUrl ?? ""} />
                          <AvatarFallback>
                            {member.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{fullName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="truncate text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant={memberIsOwner ? "default" : "secondary"}>
                        {memberIsOwner ? teamT("owner") : teamT("member")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant={member.user.isActive ? "default" : "outline"}>
                        {member.user.isActive
                          ? teamT("active")
                          : teamT("pending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <ChangeMemberRoleDialog
                          member={member}
                          organisationId={selectedOrganisationId}
                          disabled={!isOwner || isLastOwner}
                        />
                        <RemoveMemberDialog
                          member={member}
                          organisationId={selectedOrganisationId}
                          disabled={!isOwner || isLastOwner}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {meta && meta.total > members.length && (
          <p
            className="mt-3 px-4 pb-3 text-xs text-muted-foreground"
            aria-live="polite">
            {teamT("truncationHint", {
              shown: members.length,
              total: meta.total,
            })}
          </p>
        )}
      </div>
    </>
  );
}
