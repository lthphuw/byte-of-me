import { describe, expect, it } from 'bun:test';

import { isSafeHttpUrl, safeHttpUrl, toSafeHref } from './safe-http-url';

describe('isSafeHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isSafeHttpUrl('https://example.com/a?b=1#c')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000')).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'mailto:a@b.co',
    'ftp://example.com',
    '//example.com',
    '/relative',
    'example.com',
    '',
    'not a url',
  ])('rejects %p', (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });
});

describe('safeHttpUrl', () => {
  it('returns the value without surrounding spaces', () => {
    expect(safeHttpUrl.parse('  https://example.com  ')).toBe(
      'https://example.com'
    );
  });

  it('refuses a non-http(s) scheme with the validation key', () => {
    const result = safeHttpUrl.safeParse('javascript:alert(1)');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.invalidUrl');
  });

  it('refuses a value that is only spaces', () => {
    expect(safeHttpUrl.safeParse('   ').success).toBe(false);
  });
});

describe('toSafeHref', () => {
  it('passes an http(s) url through, trimmed', () => {
    expect(toSafeHref(' https://example.com/x ')).toBe('https://example.com/x');
  });

  it.each([
    null,
    undefined,
    '',
    'javascript:alert(1)',
    'data:text/html,x',
    'x',
  ])('returns null for %p', (value) => {
    expect(toSafeHref(value)).toBeNull();
  });
});
