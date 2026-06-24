import type {
  OrganisationMemberList200,
  OrganisationMemberResponseDto,
  PaginationMetaDto,
} from '../generated/model';

/** List payload from `organisationMemberList` / `useOrganisationMemberList`. */
export function extractMemberList(
  payload: OrganisationMemberList200 | undefined,
): OrganisationMemberResponseDto[] {
  return payload?.data ?? [];
}

/** Pagination meta from the same response. */
export function extractMemberListMeta(
  payload: OrganisationMemberList200 | undefined,
): PaginationMetaDto | null {
  return payload?.meta ?? null;
}
