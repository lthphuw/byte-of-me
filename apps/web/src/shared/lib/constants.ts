/**
 * TTL for the per-request reads (owner display name, workspace settings) every `(protected)` navigation
 * pays. Not load-bearing: tags (USER, WORKSPACE_SETTINGS) revalidate on write; the TTL heals out-of-app
 * edits (psql, seed, restore) and amortises the ~92ms Supabase ap-northeast-1 round trip per hour.
 */
export const LAYOUT_CACHE_REVALIDATE_SECONDS = 3600;

/**
 * Carries the requested pathname from proxy.ts to server components: an RSC layout gets `params`, never
 * the URL, and the proxy is the last layer that holds it. Reads no session, so the proxy stays free of
 * the NextAuth config (see proxy.ts).
 */
export const PATHNAME_HEADER = 'x-pathname';
