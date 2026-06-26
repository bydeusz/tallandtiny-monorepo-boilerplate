import type { Metadata } from "next";

import { UpdateAvatar } from "@/components/user/update-avatar";
import { UpdateUser } from "@/components/user/update-user";
import { UpdateUserBillingDetails } from "@/components/user/update-user-billing-details";

export const metadata: Metadata = {
  title: "Settings — Tall & Tiny",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <UpdateAvatar />
      <UpdateUser />
      <UpdateUserBillingDetails />
    </div>
  );
}
