import { cache } from 'react';
import { environmentManager, QueryClient } from '@tanstack/react-query';

/**
 * One construction point, so the server prefetch and the client provider share defaults.
 * The 60s staleTime stops hydrated data refetching on every remount (blog stats: 5 min).
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // A refused action is deterministic: the default 3 retries showed ~7s of skeleton.
        // The server keeps 0 so a failed prefetch never delays the page.
        retry: environmentManager.isServer() ? 0 : 1,
      },
    },
  });
}

/** A per-request QueryClient: `cache` shares one across the server components of a request. */
export const getQueryClient = cache(makeQueryClient);
