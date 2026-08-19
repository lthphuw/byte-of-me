import { logger } from '@byte-of-me/logger';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { z } from 'zod';

import {
  idSchema,
  INVALID_INPUT_MESSAGE,
  parseInput,
} from './validate-action-input';

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

  it('reports the offending field in detail, not in errorMsg', () => {
    const result = parseInput(schema, {
      name: 'P',
      email: 'not-an-email',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The developer detail survives — this is what a log or an admin
      // surface reads.
      expect(result.detail).toContain('name');
      expect(result.detail).toContain('Name is too short');
      expect(result.detail).toContain('email');
      expect(result.detail).toContain('Invalid email address');
    }
  });

  it('keeps schema field paths and zod messages out of errorMsg', () => {
    const result = parseInput(schema, {
      name: 'P',
      email: 'not-an-email',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // `errorMsg` is what every action forwards into `ApiResponse`, and what
      // a visitor can end up reading. It must carry none of the above.
      expect(result.errorMsg).toBe(INVALID_INPUT_MESSAGE);
      expect(result.errorMsg).not.toContain('name');
      expect(result.errorMsg).not.toContain('email');
      expect(result.errorMsg).not.toContain('Name is too short');
      expect(result.errorMsg).not.toContain('Invalid email address');
    }
  });

  it('tags a rejection with the invalid code so a client can translate it', () => {
    const result = parseInput(schema, { name: 'P', email: 'nope' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('invalid');
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

describe('parseInput logging', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name is too short'),
  });

  afterEach(() => {
    spyOn(logger, 'warn').mockRestore();
  });

  it('logs the field-level reason a rejection is not allowed to return', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});

    parseInput(schema, { name: 'P' });

    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0]?.[0] ?? '';
    expect(line).toContain('name');
    expect(line).toContain('Name is too short');
  });

  it('names the caller in the log line when one is given', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});

    parseInput(schema, { name: 'P' }, 'createBlog');

    expect(warn.mock.calls[0]?.[0] ?? '').toContain('createBlog');
  });

  it('logs nothing when the input is valid', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});

    parseInput(schema, { name: 'Phu' });

    expect(warn).not.toHaveBeenCalled();
  });
});
