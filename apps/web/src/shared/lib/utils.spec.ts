import { describe, expect, it } from 'bun:test';

import { ensureValidUrl } from './utils';

describe('ensureValidUrl', () => {
  it('leaves http(s), mailto and tel addresses alone', () => {
    expect(ensureValidUrl('https://github.com/x')).toBe('https://github.com/x');
    expect(ensureValidUrl('HTTP://example.com')).toBe('HTTP://example.com');
    expect(ensureValidUrl('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(ensureValidUrl('tel:+84123456789')).toBe('tel:+84123456789');
  });

  it('adds https:// to a bare host, with or without a port', () => {
    expect(ensureValidUrl('github.com/x')).toBe('https://github.com/x');
    expect(ensureValidUrl('example.com:8080/x')).toBe(
      'https://example.com:8080/x'
    );
    expect(ensureValidUrl('localhost:3000')).toBe('https://localhost:3000');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('collapses %p to #', (value) => {
    expect(ensureValidUrl(value)).toBe('#');
  });
});
