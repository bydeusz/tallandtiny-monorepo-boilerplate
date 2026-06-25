import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = { title: "Support — Tintsmith" };

export default function SupportPage() {
  return (
    <div className="space-y-6 p-4 md:p-12">
      <div className="flex pt-12 md:h-[calc(100vh-6rem)] md:items-center md:justify-center md:pt-0">
        <div className="w-full md:w-3/4 lg:w-1/2">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
