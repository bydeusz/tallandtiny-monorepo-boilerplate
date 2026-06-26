import type { Metadata } from "next";

import { DeleteUser } from "@/components/user/delete-user";

export const metadata: Metadata = {
  title: "Delete account — Tall & Tiny",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <DeleteUser />
    </div>
  );
}
