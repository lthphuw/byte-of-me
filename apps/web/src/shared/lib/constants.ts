/**
 * TTL for the two per-request reads that every `(protected)` navigation pays
 * for before it renders anything: the owner's display name and the workspace
 * settings.
 *
 * An hour, and the number is deliberately not load-bearing. Both entries carry
 * a tag (`USER`, `WORKSPACE_SETTINGS`) and every action that writes either row
 * revalidates it, so correctness comes from the tag — the author never waits
 * on this clock to see their own change. What the TTL covers is the case no
 * tag can: a row changed OUTSIDE the app, by a psql session, a seed run or a
 * restored dump. An hour means such a change heals on its own rather than
 * surviving until the next deploy, and it is long enough that the ~92ms
 * Supabase ap-northeast-1 round trip these reads cost is paid once per hour
 * per identity and locale instead of once per navigation. Shortening it gives
 * that win back and buys nothing the tag does not already provide.
 */
export const LAYOUT_CACHE_REVALIDATE_SECONDS = 3600;

/**
 * Carries the requested pathname from `proxy.ts` to the server components that
 * need it.
 *
 * A React Server Component layout receives `params`, never the URL — so
 * `(protected)/layout.tsx`, the one place that knows a visitor is unauthenticated,
 * cannot on its own tell which dashboard page they were reaching for.
 * That is why every rejected visitor used to land on the dashboard home regardless
 * of where they were going. The proxy is the last layer that still holds the URL, so
 * it forwards it here.
 *
 * Setting this reads no session and keeps the proxy free of the NextAuth config,
 * which the comment in `proxy.ts` explains must stay out of the edge bundle.
 */
export const PATHNAME_HEADER = 'x-pathname';
