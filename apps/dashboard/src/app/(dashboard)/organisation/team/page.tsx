import type { Metadata } from "next";

import { TeamList } from "@/components/lists/team-list";

export const metadata: Metadata = {
  title: "Team — Tintsmith",
};

export default function OrganisationTeamPage() {
  return <TeamList />;
}
