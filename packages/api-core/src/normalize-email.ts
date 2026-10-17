/**
 * The one email comparison: trimmed and lowercased (a case difference must not
 * silently refuse the owner), `''` for an absent address. Not `server-only`:
 * the owner gate and the client sign-in form both use it.
 */
export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}
