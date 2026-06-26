"use client";

import Link from "next/link";
import { useAuth } from "@repo/auth";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/ui/atoms";

export function Thumbnail() {
  const { user } = useAuth();

  if (!user?.id) {
    return null;
  }

  return (
    <Link href="/settings">
      <Avatar className="hover:ring-ring size-9 transition-all">
        {user.avatarUrl ? (
          <AvatarImage
            src={user.avatarUrl}
            alt={`avatar picture of ${user.name} ${user.surname}`}
          />
        ) : (
          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
        )}
      </Avatar>
    </Link>
  );
}
