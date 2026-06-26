import type { Metadata } from "next";
import { RegisterConfirmForm } from "@/components/forms/register-confirm-form";

export const metadata: Metadata = { title: "Confirm your email — Tall & Tiny" };

export default function RegisterConfirmPage() {
  return <RegisterConfirmForm />;
}
