import { describe, expect, it } from 'bun:test';

import { normalizeLinkInput, SAFE_SCHEMES, schemeOf } from './url';

describe('schemeOf', () => {
  it('reads the scheme, lowercased', () => {
    expect(schemeOf('HTTPS://a.test')).toBe('https');
    expect(schemeOf('mailto:me@a.test')).toBe('mailto');
  });

  it('is null for a relative address', () => {
    expect(schemeOf('/about')).toBeNull();
    expect(schemeOf('example.com/x')).toBeNull();
  });
});

describe('SAFE_SCHEMES', () => {
  it('lets http, https, mailto and tel through and nothing else', () => {
    expect([...SAFE_SCHEMES].sort()).toEqual([
      'http',
      'https',
      'mailto',
      'tel',
    ]);
  });
});

describe('normalizeLinkInput', () => {
  it('keeps an address that already has a safe scheme, as typed', () => {
    expect(normalizeLinkInput('https://example.com/a?b=1')).toBe(
      'https://example.com/a?b=1'
    );
    expect(normalizeLinkInput('mailto:me@example.com')).toBe(
      'mailto:me@example.com'
    );
    expect(normalizeLinkInput('tel:+84901234567')).toBe('tel:+84901234567');
  });

  it('does not put https:// in front of a mailto or a tel', () => {
    expect(normalizeLinkInput('mailto:me@example.com')).not.toContain('https');
  });

  it('keeps a path, a fragment and a query', () => {
    expect(normalizeLinkInput('/about')).toBe('/about');
    expect(normalizeLinkInput('#references')).toBe('#references');
    expect(normalizeLinkInput('?page=2')).toBe('?page=2');
  });

  it('turns a bare domain into an https address', () => {
    expect(normalizeLinkInput('example.com')).toBe('https://example.com/');
    expect(normalizeLinkInput('example.com/path')).toBe(
      'https://example.com/path'
    );
  });

  it('trims what was pasted around it', () => {
    expect(normalizeLinkInput('  example.com \n')).toBe('https://example.com/');
  });

  it('refuses a scheme outside the allowlist', () => {
    expect(normalizeLinkInput('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkInput('data:text/html,<b>x</b>')).toBeNull();
    expect(normalizeLinkInput('ftp://example.com/a.txt')).toBeNull();
  });

  it('refuses text that is not an address', () => {
    expect(normalizeLinkInput('')).toBeNull();
    expect(normalizeLinkInput('hello')).toBeNull();
    expect(normalizeLinkInput('two words.com')).toBeNull();
  });
});
