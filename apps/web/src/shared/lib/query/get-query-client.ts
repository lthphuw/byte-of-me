import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';

/**
 * A per-request QueryClient for server-side prefetching. `cache` dedupes it
 * across a single request so multiple server components share one instance and
 * its dehydrated state hydrates the client cache.
 */
export const getQueryClient = cache(() => new QueryClient());
