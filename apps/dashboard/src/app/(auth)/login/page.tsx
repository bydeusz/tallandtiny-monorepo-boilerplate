import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = { title: "Sign in — Tall & Tiny" };

export default function LoginPage() {
  return <LoginForm />;
}
