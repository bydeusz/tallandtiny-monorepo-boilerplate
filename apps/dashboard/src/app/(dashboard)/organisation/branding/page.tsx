import type { Metadata } from "next";
import { Suspense } from "react";

import { UpdateOrganisationBranding } from "@/components/organisation/update-organisation-branding";

export const metadata: Metadata = {
  title: "Branding — Tintsmith",
};

export default function OrganisationBrandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <UpdateOrganisationBranding />
      </Suspense>
    </div>
  );
}
