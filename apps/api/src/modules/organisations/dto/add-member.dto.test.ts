import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AddMemberDto } from './add-member.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  transform: true,
});
const meta: ArgumentMetadata = { type: 'body', metatype: AddMemberDto, data: '' };

describe('AddMemberDto', () => {
  it('accepts an email-only payload (existing user link)', async () => {
    const result = await pipe.transform({ email: 'a@example.com' }, meta);
    expect(result).toBeInstanceOf(AddMemberDto);
    expect(result.email).toBe('a@example.com');
  });

  it('rejects an invalid email', async () => {
    await expect(
      pipe.transform({ email: 'not-an-email' }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown field such as role', async () => {
    await expect(
      pipe.transform({ email: 'a@example.com', role: 'OWNER' }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
