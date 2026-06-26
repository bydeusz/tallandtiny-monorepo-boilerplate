import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = { title: "Create account — Tall & Tiny" };

export default function RegisterPage() {
  return <RegisterForm />;
}
