import { z } from 'zod';

import { idSchema, parseInput } from './validate-action-input';

describe('parseInput', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name is too short'),
    email: z.string().email('Invalid email address'),
  });

  it('returns ok with the parsed data for valid input', () => {
    const result = parseInput(schema, {
      name: 'Phu',
      email: 'phu@example.com',
    });

    expect(result).toEqual({
      ok: true,
      data: { name: 'Phu', email: 'phu@example.com' },
    });
  });

  it('strips unknown keys so downstream code only sees schema fields', () => {
    const result = parseInput(schema, {
      name: 'Phu',
      email: 'phu@example.com',
      isAdmin: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toHaveProperty('isAdmin');
    }
  });

  it('returns ok:false with a message naming the offending field', () => {
    const result = parseInput(schema, {
      name: 'P',
      email: 'not-an-email',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMsg).toContain('name');
      expect(result.errorMsg).toContain('Name is too short');
      expect(result.errorMsg).toContain('email');
      expect(result.errorMsg).toContain('Invalid email address');
    }
  });

  it('rejects non-object input against an object schema', () => {
    const result = parseInput(schema, 'nope');
    expect(result.ok).toBe(false);
  });

  it('idSchema rejects empty strings and non-strings', () => {
    expect(parseInput(idSchema, '').ok).toBe(false);
    expect(parseInput(idSchema, undefined).ok).toBe(false);
    expect(parseInput(idSchema, 'abc123')).toEqual({
      ok: true,
      data: 'abc123',
    });
  });
});
