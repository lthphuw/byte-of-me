/**
 * `sanitizeCallbackUrl` decides where a browser is sent immediately after it
 * authenticates, from a value that arrives on the URL as `?from=`. The contract
 * it defends is therefore a security one — "the destination is always a path on
 * this site" — plus the locale correctness that made the parameter necessary in
 * the first place.
 *
 * Imported by path rather than through `@/shared/lib/auth`, because the barrel
 * is replaced wholesale by `next-runtime-stubs.ts`; this exercises the real
 * implementation.
 */
import { describe, expect, it } from 'bun:test';

import { sanitizeCallbackUrl } from './callback-url';

describe('sanitizeCallbackUrl', () => {
  describe('refuses to leave the site', () => {
    // Each of these is a way to express "somewhere else" that still looks
    // path-ish enough to slip past a naive `startsWith('/')` check.
    const offSiteCandidates = [
      'https://evil.example',
      'http://evil.example',
      '//evil.example',
      '//evil.example/notes',
      '/\\evil.example',
      'javascript:alert(1)',
      'notes',
    ];

    for (const candidate of offSiteCandidates) {
      it(`sends ${candidate} to the dashboard instead`, () => {
        expect(sanitizeCallbackUrl(candidate, 'en')).toBe('/en/dashboard');
      });
    }

    it('rejects a value carrying a newline, which could split a header', () => {
      expect(sanitizeCallbackUrl('/notes\r\nLocation: //evil.example', 'en')).toBe(
        '/en/dashboard'
      );
    });
  });

  describe('falls back when there is nothing to honour', () => {
    it('defaults an absent value to the dashboard', () => {
      expect(sanitizeCallbackUrl(undefined, 'en')).toBe('/en/dashboard');
      expect(sanitizeCallbackUrl(null, 'en')).toBe('/en/dashboard');
      expect(sanitizeCallbackUrl('', 'en')).toBe('/en/dashboard');
    });

    it('refuses to send a freshly signed-in visitor back to sign-in', () => {
      // `(auth)/layout.tsx` bounces an authenticated owner off this page, so
      // honouring it would be a redirect loop.
      expect(sanitizeCallbackUrl('/auth/login', 'en')).toBe('/en/dashboard');
      expect(sanitizeCallbackUrl('/vi/auth/login', 'vi')).toBe('/vi/dashboard');
    });
  });

  describe('preserves the destination', () => {
    it('keeps an internal path and prefixes the active locale', () => {
      expect(sanitizeCallbackUrl('/notes', 'vi')).toBe('/vi/notes');
    });

    it('keeps a query string on the destination', () => {
      expect(sanitizeCallbackUrl('/dashboard/blogs?page=2', 'en')).toBe(
        '/en/dashboard/blogs?page=2'
      );
    });
  });

  describe('locale handling', () => {
    it('does not double-prefix a path that already carries the locale', () => {
      expect(sanitizeCallbackUrl('/vi/notes', 'vi')).toBe('/vi/notes');
    });

    it('re-prefixes a path carrying a different locale to the active one', () => {
      // The visitor signs in under one locale; the destination should follow
      // them rather than strand them in the other language.
      expect(sanitizeCallbackUrl('/en/notes', 'vi')).toBe('/vi/notes');
    });

    it('maps a bare locale root to that locale home', () => {
      expect(sanitizeCallbackUrl('/vi', 'vi')).toBe('/vi/');
    });
  });

  describe('overrides for the share-recipient flow', () => {
    it('honours an overridden default destination', () => {
      // A recipient cannot fall back to /dashboard: (protected) bounces
      // anyone who is not the site owner straight back out.
      expect(
        sanitizeCallbackUrl(undefined, 'en', { defaultDestination: '/shared' })
      ).toBe('/en/shared');
    });

    it('treats the overridden sign-in path as the loop guard', () => {
      expect(
        sanitizeCallbackUrl('/invite', 'en', {
          defaultDestination: '/shared',
          signInPath: '/invite',
        })
      ).toBe('/en/shared');
    });

    it('still guards the owner sign-in path by default', () => {
      expect(sanitizeCallbackUrl('/auth/login', 'en')).toBe('/en/dashboard');
    });

    it('accepts a shared-surface path unchanged', () => {
      expect(sanitizeCallbackUrl('/shared/notes/abc', 'vi')).toBe(
        '/vi/shared/notes/abc'
      );
    });

    it('falls back to the overridden destination for a hostile candidate', () => {
      expect(
        sanitizeCallbackUrl('//evil.example', 'en', {
          defaultDestination: '/shared',
        })
      ).toBe('/en/shared');
    });
  });
});
