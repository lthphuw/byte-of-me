'use server';

import type { ApiResponse } from '@byte-of-me/api-core';

import { loadPublicFeaturedWorks } from '@/entities/featured-work/lib/load-public-featured-works';
import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';

/**
 * Featured works for the homepage, at most six, in the owner's order.
 * A bare wrapper: the injectable core stays in `lib/`, out of any public endpoint.
 */
export async function getPublicFeaturedWorks(): Promise<
  ApiResponse<{ works: PublicFeaturedWork[] }>
> {
  return loadPublicFeaturedWorks();
}
