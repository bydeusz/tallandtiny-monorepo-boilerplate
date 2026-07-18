import type { Metadata } from 'next';
import { ResetPasswordForm } from '@repo/auth/components';

export const metadata: Metadata = { title: 'Reset password — Tall & Tiny' };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
