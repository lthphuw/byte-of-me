/**
 * The one way this app compares email addresses.
 *
 * Deliberately NOT marked `server-only`: the owner gate and the sign-in form
 * both need it, and the form is a client component.
 *
 * Comparison is case-insensitive and trimmed because providers vary in how
 * they present an address, and a case difference silently refusing someone
 * their own access is the worst kind of failure — correct-looking and
 * invisible. An absent address normalises to `''` so callers reject it with a
 * falsy check instead of each inventing their own null handling.
 */
export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}
