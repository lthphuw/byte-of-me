/**
 * The one way this app compares email addresses.
 *
 * Deliberately NOT marked `server-only`: the owner gate, the note-share grant
 * lookup and the invite form all need it, and the last of those runs in a
 * client component.
 *
 * Comparison is case-insensitive and trimmed because providers vary in how
 * they present an address, and a case difference silently refusing someone
 * their own grant is the worst kind of failure — correct-looking and
 * invisible. An absent address normalises to `''` so callers reject it with a
 * falsy check instead of each inventing their own null handling.
 */
export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}
