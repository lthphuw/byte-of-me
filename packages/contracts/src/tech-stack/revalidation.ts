import { CACHE_TAGS } from '@byte-of-me/api-core';

/** Tech names are embedded in public project reads, so a tech change refreshes both. */
export const TECH_MUTATION_TAGS = [
  CACHE_TAGS.TECH,
  CACHE_TAGS.PROJECT,
] as const;
