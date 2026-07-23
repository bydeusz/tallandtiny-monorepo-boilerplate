import type { Metadata } from 'next';
import { RegisterConfirmForm } from '@repo/auth/components';

export const metadata: Metadata = { title: 'Confirm your email — Tall & Tiny' };

export default function RegisterConfirmPage() {
  return <RegisterConfirmForm />;
}
