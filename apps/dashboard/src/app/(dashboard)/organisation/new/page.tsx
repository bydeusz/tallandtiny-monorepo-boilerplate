import type { Metadata } from "next";

import { CreateOrganisationPageClient } from "./ui";

export const metadata: Metadata = {
  title: "New organisation — Tintsmith",
};

export default function NewOrganisationPage() {
  return <CreateOrganisationPageClient />;
}
