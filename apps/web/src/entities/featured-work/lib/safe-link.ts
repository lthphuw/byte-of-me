/**
 * The database is not trusted to hold a safe url: anything that is not http(s)
 * (`javascript:`, `data:`, garbage) becomes a non-link with no host.
 */
export function safeLink(
  raw: string | null
): { url: string; host: string | null } | { url: null; host: null } {
  if (!raw) return { url: null, host: null };
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: null, host: null };
    }
    return { url: raw, host: parsed.hostname.replace(/^www\./, '') || null };
  } catch {
    return { url: null, host: null };
  }
}
