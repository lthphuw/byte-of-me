import { z } from 'zod';

/**
 * Whether `value` is an absolute http(s) URL. `new URL()` and zod's `.url()`
 * accept `javascript:` and `data:`, and an admin link is rendered as an `href`.
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
 * Render-time defence for a database `href` (not trusted): anything but http(s)
 * (`javascript:`, `data:`, garbage, empty) becomes `null`; the caller drops it.
 */
export function toSafeHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}
