import { describe, expect, it } from 'bun:test';

import { TAG_MUTATION_TAGS } from './revalidation';

import { CACHE_TAGS } from '@/shared/lib/constants';

describe('TAG_MUTATION_TAGS', () => {
  it('refreshes the public blog cache along with the tag cache, since blogs embed tag names', () => {
    expect(TAG_MUTATION_TAGS).toContain(CACHE_TAGS.TAG);
    expect(TAG_MUTATION_TAGS).toContain(CACHE_TAGS.BLOG);
  });
});
