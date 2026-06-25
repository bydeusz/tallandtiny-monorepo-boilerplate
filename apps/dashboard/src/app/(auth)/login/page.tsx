import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign in — Tintsmith" };

export default function LoginPage() {
  return <LoginForm />;
}
