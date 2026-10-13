import { CACHE_TAGS } from '@/shared/lib/constants';

/** Tag names are embedded in public blog reads, so a tag change refreshes both. */
export const TAG_MUTATION_TAGS = [CACHE_TAGS.TAG, CACHE_TAGS.BLOG] as const;
