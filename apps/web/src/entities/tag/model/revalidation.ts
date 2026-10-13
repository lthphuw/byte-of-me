import { CACHE_TAGS } from '@/shared/lib/constants';

/** Tag names are embedded in public blog and project reads, so a tag change refreshes all three. */
export const TAG_MUTATION_TAGS = [
  CACHE_TAGS.TAG,
  CACHE_TAGS.BLOG,
  CACHE_TAGS.PROJECT,
] as const;
