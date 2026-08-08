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
 * Both defaults above name the OWNER's flow, and neither fits a share
 * recipient: `/dashboard` bounces anyone who is not the site owner, and the
 * loop guard has to name `/invite` instead.
 *
 * Overrides rather than a second function, so there is still exactly one
 * place deciding what an absent or hostile `?from=` means — the property this
 * module's doc comment above exists to protect.
 */
interface SanitizeCallbackUrlOptions {
  /** Where to land when nothing better is known. */
  defaultDestination?: string;
  /** This flow's own sign-in page; landing back on it is an immediate loop. */
  signInPath?: string;
}

/**
 * Turn an untrusted `?from=` value into a safe, locale-prefixed internal path.
 *
 * Every sign-in entry point funnels through this one function — the email magic
 * link and both OAuth buttons — for the same reason `isSiteOwnerEmail()` is a
 * single function: two independently-written versions of a rule are exactly how
 * one of them stops normalising and nobody notices.
 *
 * Two things are being defended here.
 *
 * **Open redirect.** `callbackUrl` reaches the browser as a `Location`, so an
 * attacker who can put a value in `?from=` chooses where the owner's browser
 * goes after authenticating. Only a path — one leading slash, nothing else — is
 * accepted. Note `\` is normalised to `/` by browsers, so `/\evil.com` is a
 * protocol-relative URL wearing a path costume and is rejected alongside `//`.
 * Anything that fails the check silently degrades to the dashboard rather than
 * erroring: a mangled `from` should not cost the owner their sign-in.
 *
 * **A lost locale.** The redirect that produced `from` may have dropped the
 * locale prefix, and next-intl would then resolve the bare path to
 * `defaultLocale` — a `vi` reader signing in to read their notes would land on
 * the `en` copy. The prefix is therefore stripped and re-applied from the
 * locale in force at sign-in time, so a path that already carries one is not
 * double-prefixed into `/vi/vi/notes`.
 */
export function sanitizeCallbackUrl(
  candidate: string | null | undefined,
  locale: string,
  options: SanitizeCallbackUrlOptions = {}
): string {
  const destination = options.defaultDestination ?? DEFAULT_DESTINATION;
  const signInPath = options.signInPath ?? SIGN_IN_PATH;

  const path = stripLocalePrefix(toInternalPath(candidate, destination));

  if (path === signInPath || path.startsWith(`${signInPath}/`)) {
    return `/${locale}${destination}`;
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
