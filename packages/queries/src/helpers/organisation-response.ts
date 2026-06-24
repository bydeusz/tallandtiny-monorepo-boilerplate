import type {
  OrganisationList200,
  OrganisationResponseDto,
} from '../generated/model';

/** List payload from `organisationList` / `useOrganisationList`. */
export function extractOrganisationList(
  payload: OrganisationList200 | undefined,
): OrganisationResponseDto[] {
  return payload?.data ?? [];
}
