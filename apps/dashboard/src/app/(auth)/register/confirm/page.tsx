import type { Metadata } from "next";
import { RegisterConfirmForm } from "@/components/forms/register-confirm-form";

export const metadata: Metadata = { title: "Confirm your email — Tintsmith" };

export default function RegisterConfirmPage() {
  return <RegisterConfirmForm />;
}
