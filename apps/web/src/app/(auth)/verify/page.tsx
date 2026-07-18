import type { Metadata } from 'next';
import { VerifyEmailForm } from '@repo/auth/components';

export const metadata: Metadata = { title: 'Verify email — Tall & Tiny' };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailForm email={email ?? ''} />;
}
