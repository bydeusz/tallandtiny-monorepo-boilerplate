import type { Metadata } from 'next';
import { RegisterForm } from '@repo/auth/components';

export const metadata: Metadata = { title: 'Create account — Tall & Tiny' };

export default function RegisterPage() {
  return <RegisterForm />;
}
