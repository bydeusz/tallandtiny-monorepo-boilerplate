import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto';

// Mirrors the global pipe configured in main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const meta: ArgumentMetadata = { type: 'body', metatype: RegisterDto, data: '' };

const validBody = {
  name: 'Ada',
  surname: 'Lovelace',
  email: 'ada@bydeusz.com',
  password: 'password123',
};

describe('RegisterDto — no privilege escalation via registration', () => {
  it('rejects a registration payload that tries to set a role', async () => {
    await expect(
      pipe.transform({ ...validBody, role: 'SUPER_ADMIN' }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid payload and never carries a role field', async () => {
    const result = await pipe.transform(validBody, meta);

    expect(result).not.toHaveProperty('role');
  });
});
