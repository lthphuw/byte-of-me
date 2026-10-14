import { describe, expect, it } from 'bun:test';

import { contactMessageSchema } from './contact-message-schema';

const validValues = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'A message that is long enough.',
};

describe('contactMessageSchema email', () => {
  it('accepts an ordinary address', () => {
    expect(contactMessageSchema.safeParse(validValues).success).toBe(true);
  });

  it('accepts an address exactly 254 characters long', () => {
    // local part 64 + '@' + labels of 63 + '.com' = 254
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(
      63
    )}.${'d'.repeat(57)}.com`;
    expect(email.length).toBe(254);
    expect(
      contactMessageSchema.safeParse({ ...validValues, email }).success
    ).toBe(true);
  });

  it('rejects an address over 254 characters with the invalid-email message', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(
      63
    )}.${'d'.repeat(58)}.com`;
    expect(email.length).toBe(255);

    const result = contactMessageSchema.safeParse({ ...validValues, email });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid email address');
  });

  it('rejects a huge value without parsing it as an address list', () => {
    const email = `${'a@b.co,'.repeat(10000)}x@y.co`;
    expect(
      contactMessageSchema.safeParse({ ...validValues, email }).success
    ).toBe(false);
  });
});
