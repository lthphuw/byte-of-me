import { cache } from 'react';
import { environmentManager, QueryClient } from '@tanstack/react-query';

/**
 * Single construction point so server prefetching and the client provider
 * share the same defaults. The 60s staleTime keeps freshly hydrated or
 * fetched data from refetching on every remount; individual queries override
 * it where they need to (e.g. the blogs list uses 5 minutes).
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Unwrapped `{ success: false }` is deterministic: the default 3
        // retries showed ~7s of skeleton. The server keeps 0 so a failed
        // prefetch never delays the page.
        retry: environmentManager.isServer() ? 0 : 1,
      },
    },
  });
}

/**
 * A per-request QueryClient for server-side prefetching. `cache` dedupes it
 * across a single request so multiple server components share one instance and
 * its dehydrated state hydrates the client cache.
 */
export const getQueryClient = cache(makeQueryClient);
