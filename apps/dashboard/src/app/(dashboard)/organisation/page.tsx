import type { Metadata } from "next";
import { Suspense } from "react";

import { UpdateOrganisation } from "@/components/organisation/update-organisation";

export const metadata: Metadata = {
  title: "Organisation — Tintsmith",
};

export default function OrganisationPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <UpdateOrganisation />
      </Suspense>
    </div>
  );
}
