/**
 * Filter lists and search text come from anonymous callers and are bounded;
 * an oversized or ill-typed filter is refused with no query run.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPaginatedPublicProjects } from './get-paginated-public-projects';

import {
  MAX_FILTER_SLUGS,
  MAX_SEARCH_LENGTH,
  MAX_SLUG_LENGTH,
} from '@/shared/lib/public-input-schema';

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'project', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const slugs = (n: number) => Array.from({ length: n }, (_, i) => `s-${i}`);

describe('getPaginatedPublicProjects', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
  });

  it('accepts filters at the limits', async () => {
    const res = await getPaginatedPublicProjects({
      tagSlugs: slugs(MAX_FILTER_SLUGS),
      techStackSlugs: [`${'a'.repeat(MAX_SLUG_LENGTH)}`],
      search: 'x'.repeat(MAX_SEARCH_LENGTH),
    });

    expect(res.success).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['too many tag slugs', { tagSlugs: slugs(MAX_FILTER_SLUGS + 1) }],
    ['too many tech slugs', { techStackSlugs: slugs(MAX_FILTER_SLUGS + 1) }],
    ['an oversized slug', { tagSlugs: ['a'.repeat(MAX_SLUG_LENGTH + 1)] }],
    ['an empty slug', { tagSlugs: [''] }],
    ['an oversized search', { search: 'x'.repeat(MAX_SEARCH_LENGTH + 1) }],
    ['a search that is not text', { search: { contains: '' } }],
    ['slugs that are not strings', { tagSlugs: [{ not: '' }] }],
    ['a list that is not an array', { techStackSlugs: 'react' }],
  ])('refuses %s without querying', async (_label, params) => {
    const res = await getPaginatedPublicProjects(
      params as unknown as Parameters<typeof getPaginatedPublicProjects>[0]
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
