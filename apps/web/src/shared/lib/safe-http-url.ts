import { z } from 'zod';

/**
 * Whether `value` parses as an absolute http(s) URL.
 *
 * The scheme is restricted rather than left to `new URL()` (or zod's
 * `.url()`, which only requires `new URL()` to parse): both happily accept
 * `javascript:` and `data:`, and an admin-authored link is rendered straight
 * into an `href` on the public site.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** A trimmed http(s) URL. The message is a `validation.*` key the form translates. */
export const safeHttpUrl = z
  .string()
  .trim()
  .refine(isSafeHttpUrl, 'validation.invalidUrl');

/**
 * Render-time defence for an `href` read from the database, which is not
 * trusted to hold a safe URL: anything that is not http(s) (`javascript:`,
 * `data:`, garbage, empty) becomes `null`, and the caller drops the link.
 */
export function toSafeHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}
