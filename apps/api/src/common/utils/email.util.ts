import { BadRequestException } from '@nestjs/common';

/**
 * Throws BadRequestException if the email's domain is not in the
 * allow-list. Pass the resolved list (e.g. from
 * `configService.get<string[]>('auth.allowedEmailDomains')`) so the
 * util stays free of framework dependencies.
 */
export function assertEmailDomainAllowed(
  email: string,
  allowedDomains: readonly string[],
): void {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain || !allowedDomains.includes(domain)) {
    throw new BadRequestException('Email domain is not allowed.');
  }
}
