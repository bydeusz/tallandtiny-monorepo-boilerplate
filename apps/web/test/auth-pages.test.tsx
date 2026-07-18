import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@repo/auth/components', () => ({
  LoginForm: (props: { showRegister?: boolean }) => (
    <div
      data-testid="login-form"
      data-show-register={String(props.showRegister ?? true)}
    />
  ),
  RegisterForm: () => <div data-testid="register-form" />,
  RegisterConfirmForm: () => <div data-testid="register-confirm-form" />,
  VerifyEmailForm: ({ email }: { email: string }) => (
    <div data-testid="verify-form" data-email={email} />
  ),
  ResetPasswordForm: () => <div data-testid="reset-form" />,
  PasswordForm: ({ email }: { email: string }) => (
    <div data-testid="password-form" data-email={email} />
  ),
}));

const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirectMock(url);
  },
}));

import LoginPage from '../src/app/(auth)/login/page';
import RegisterPage from '../src/app/(auth)/register/page';
import RegisterConfirmPage from '../src/app/(auth)/register/confirm/page';
import VerifyPage from '../src/app/(auth)/verify/page';
import ResetPasswordPage from '../src/app/(auth)/reset-password/page';
import ResetConfirmPage from '../src/app/(auth)/reset-password/confirm/page';

describe('web (auth) pages', () => {
  it('login renders LoginForm with the register link enabled by default', () => {
    render(<LoginPage />);
    expect(
      screen.getByTestId('login-form').getAttribute('data-show-register'),
    ).toBe('true');
  });

  it('register renders RegisterForm', () => {
    render(<RegisterPage />);
    expect(screen.getByTestId('register-form')).toBeTruthy();
  });

  it('register/confirm renders RegisterConfirmForm', () => {
    render(<RegisterConfirmPage />);
    expect(screen.getByTestId('register-confirm-form')).toBeTruthy();
  });

  it('verify passes the email query param to VerifyEmailForm', async () => {
    const ui = await VerifyPage({
      searchParams: Promise.resolve({ email: 'a@b.com' }),
    });
    render(ui);
    expect(screen.getByTestId('verify-form').getAttribute('data-email')).toBe(
      'a@b.com',
    );
  });

  it('verify passes empty string when email is absent', async () => {
    const ui = await VerifyPage({ searchParams: Promise.resolve({}) });
    render(ui);
    expect(screen.getByTestId('verify-form').getAttribute('data-email')).toBe(
      '',
    );
  });

  it('reset-password renders ResetPasswordForm', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByTestId('reset-form')).toBeTruthy();
  });

  it('reset-password/confirm redirects when email is missing', async () => {
    redirectMock.mockClear();
    await ResetConfirmPage({ searchParams: Promise.resolve({}) });
    expect(redirectMock).toHaveBeenCalledWith('/reset-password');
  });

  it('reset-password/confirm renders PasswordForm with the email', async () => {
    const ui = await ResetConfirmPage({
      searchParams: Promise.resolve({ email: 'x@y.com' }),
    });
    render(ui);
    expect(
      screen.getByTestId('password-form').getAttribute('data-email'),
    ).toBe('x@y.com');
  });
});
