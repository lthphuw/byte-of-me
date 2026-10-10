'use server';

import { loadPublicFeaturedWorks } from '@/entities/featured-work/lib/load-public-featured-works';
import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Published featured works for the homepage: at most six, in the owner's order.
 *
 * Deliberately a bare wrapper. A `'use server'` export is a public endpoint, and
 * the injectable core takes functions (and would fan GitHub lookups out over
 * caller-chosen urls), so it stays in `lib/` where nothing client-side can call it.
 */
export async function getPublicFeaturedWorks(): Promise<
  ApiResponse<{ works: PublicFeaturedWork[] }>
> {
  return loadPublicFeaturedWorks();
}
