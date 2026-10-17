import { describe, expect, it } from 'bun:test';

import { isValidUrl } from './tiptap-utils';

describe('isValidUrl', () => {
  it('accepts absolute http(s) urls', () => {
    expect(isValidUrl('https://a.test/x?y=1')).toBe(true);
    expect(isValidUrl('http://a.test')).toBe(true);
  });

  it('rejects other schemes and fragments', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('mailto:a@b.test')).toBe(false);
    expect(isValidUrl('/relative')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
  });
});
