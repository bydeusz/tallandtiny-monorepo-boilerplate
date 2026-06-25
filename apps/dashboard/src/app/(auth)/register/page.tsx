import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = { title: "Create account — Tintsmith" };

export default function RegisterPage() {
  return <RegisterForm />;
}
