import { describe, expect, it } from 'bun:test';

import { TAG_MUTATION_TAGS } from './revalidation';

import { CACHE_TAGS } from '@/shared/lib/constants';

describe('TAG_MUTATION_TAGS', () => {
  it('refreshes the public blog and project caches with the tag cache, since both embed tag names', () => {
    expect(TAG_MUTATION_TAGS).toEqual([
      CACHE_TAGS.TAG,
      CACHE_TAGS.BLOG,
      CACHE_TAGS.PROJECT,
    ]);
  });
});
