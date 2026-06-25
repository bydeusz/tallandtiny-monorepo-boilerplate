"use client";

import { useMemo } from "react";
import {
  useOrganisationMemberList,
  OrganisationRole,
  extractMemberList,
  type OrganisationMemberListParams,
} from "@repo/queries";
import { useAuth } from "./auth-provider";

const LIST_PARAMS = {
  page: 1,
  limit: 100,
} as unknown as OrganisationMemberListParams;

type Result = {
  isOwner: boolean;
  isMember: boolean;
  isLoading: boolean;
};

/**
 * Whether the authenticated user is OWNER (or at least MEMBER) of the given
 * organisation. Reads from the cached member list. `isOwner` defaults to false
 * while loading.
 */
export function useOrganisationOwnership(
  organisationId: string | null | undefined,
): Result {
  const { user } = useAuth();
  const enabled = Boolean(organisationId) && Boolean(user);

  const { data: rawList, isLoading } = useOrganisationMemberList(
    organisationId ?? "",
    LIST_PARAMS,
    { query: { enabled } },
  );

  const members = useMemo(() => extractMemberList(rawList), [rawList]);

  const currentMembership = useMemo(
    () => members.find((m) => m.userId === user?.id) ?? null,
    [members, user?.id],
  );

  return {
    isOwner: currentMembership?.role === OrganisationRole.OWNER,
    isMember: currentMembership !== null,
    isLoading: enabled && isLoading,
  };
}
