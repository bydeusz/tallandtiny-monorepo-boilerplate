import type { Metadata } from "next";
import { LoginForm } from "@repo/auth/components";

export const metadata: Metadata = { title: "Sign in — Tall & Tiny" };

export default function LoginPage() {
  return <LoginForm />;
}
