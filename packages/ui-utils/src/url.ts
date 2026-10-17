/**
 * Schemes a link may carry. An allowlist, not a denylist, so it fails closed on schemes nobody
 * thought of. The sanitizer, the BibTeX import and the link control all read this one list.
 */
export const SAFE_SCHEMES: ReadonlySet<string> = new Set([
  'http',
  'https',
  'mailto',
  'tel',
]);

/** The lowercased scheme `value` opens with (`https` for `https://x`), or null. */
export function schemeOf(value: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  return match ? match[1].toLowerCase() : null;
}

/**
 * What an author typed into a link field, as an address to store; null when it is not one.
 * Kept as typed: a safe scheme, a path, a fragment or a query; a bare domain gets `https://`.
 * A host with a port needs its scheme (`example.com:8080` reads as scheme `example.com`).
 */
export function normalizeLinkInput(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;

  const scheme = schemeOf(value);
  if (scheme) return SAFE_SCHEMES.has(scheme) ? value : null;

  if (/^[/#?]/.test(value)) return value;
  if (!value.includes('.')) return null;

  try {
    return new URL(`https://${value}`).toString();
  } catch {
    return null;
  }
}
