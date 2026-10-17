import { describe, expect, it } from 'bun:test';

import { getClientIp } from './client-ip';

describe('getClientIp', () => {
  it('prefers the Vercel header a caller cannot overwrite', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.7',
      'x-real-ip': '198.51.100.2',
      'x-forwarded-for': '192.0.2.99, 198.51.100.2',
    });

    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then the first x-forwarded-for entry', () => {
    expect(
      getClientIp(
        new Headers({
          'x-real-ip': '198.51.100.2',
          'x-forwarded-for': '192.0.2.99',
        })
      )
    ).toBe('198.51.100.2');

    expect(
      getClientIp(new Headers({ 'x-forwarded-for': '192.0.2.99, 10.0.0.1' }))
    ).toBe('192.0.2.99');
  });

  it('accepts IPv6 addresses', () => {
    expect(
      getClientIp(new Headers({ 'x-vercel-forwarded-for': '2001:db8::1' }))
    ).toBe('2001:db8::1');
  });

  it('never keys a bucket on a value that is not an IP', () => {
    const forged = new Headers({
      'x-vercel-forwarded-for': 'not-an-ip',
      'x-forwarded-for': `${'a'.repeat(500)}, 192.0.2.99`,
    });

    expect(getClientIp(forged)).toBe('unknown');
  });

  it('shares one bucket when no header is present', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
