import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/forms/password-form";

export const metadata: Metadata = { title: "Set new password — Tall & Tiny" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/reset-password");
  }

  return <PasswordForm email={email} />;
}
