import type { Metadata } from "next";

import { ChangeEmail } from "@/components/user/change-email";
import { UpdatePassword } from "@/components/user/update-password";

export const metadata: Metadata = {
  title: "Account — Tall & Tiny",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <ChangeEmail />
      <UpdatePassword />
    </div>
  );
}
