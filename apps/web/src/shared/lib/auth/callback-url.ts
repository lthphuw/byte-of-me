import { routing } from '@/shared/i18n/routing';

/**
 * Where a sign-in lands when nothing better is known.
 */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * The sign-in page itself. Sending someone back here after they signed in is an
 * immediate loop: `(auth)/layout.tsx` bounces an authenticated owner straight
 * back out again.
 */
const SIGN_IN_PATH = '/auth/login';

/**
 * Turn an untrusted `?from=` into a safe, locale-prefixed internal path. Open redirect: only one
 * leading slash is accepted, and `/\evil.com` is rejected because browsers normalise `\` to `/`.
 * The locale prefix is stripped and re-applied so a bare path does not resolve to defaultLocale.
 */
export function sanitizeCallbackUrl(
  candidate: string | null | undefined,
  locale: string
): string {
  const path = stripLocalePrefix(
    toInternalPath(candidate, DEFAULT_DESTINATION)
  );

  if (path === SIGN_IN_PATH || path.startsWith(`${SIGN_IN_PATH}/`)) {
    return `/${locale}${DEFAULT_DESTINATION}`;
  }

  return `/${locale}${path}`;
}

function toInternalPath(
  candidate: string | null | undefined,
  fallback: string
): string {
  if (!candidate || hasControlCharacter(candidate)) {
    return fallback;
  }

  const isInternalPath =
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !candidate.startsWith('/\\');

  return isInternalPath ? candidate : fallback;
}

/**
 * A newline or NUL in the value would let it split the header the callback URL
 * is eventually written into. Checked by codepoint rather than by a regex
 * literal so the control characters never appear in this source file.
 */
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }

  return false;
}

function stripLocalePrefix(path: string): string {
  for (const locale of routing.locales) {
    if (path === `/${locale}`) {
      return '/';
    }

    if (path.startsWith(`/${locale}/`)) {
      return path.slice(`/${locale}`.length);
    }
  }

  return path;
}
