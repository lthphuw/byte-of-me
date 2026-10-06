/**
 * The id must be a plain id, the limit is clamped and the tag list capped
 * before Prisma; a refused call runs no query.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getRelatedPublicBlogs } from './get-related-public-blogs';

import { MAX_RELATED_BLOGS } from '@/entities/blog/model/blog-schema';
import { MAX_FILTER_SLUGS } from '@/shared/lib/public-input-schema';

const findMany = mock();
Object.defineProperty(prisma, 'blog', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('getRelatedPublicBlogs', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it('clamps an oversized limit before it reaches Prisma', async () => {
    await getRelatedPublicBlogs(BLOG_ID, ['react'], 1_000_000);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_RELATED_BLOGS })
    );
  });

  it('caps the tag list instead of fanning out over all of it', async () => {
    const slugs = Array.from({ length: 40 }, (_, i) => `tag-${i}`);

    await getRelatedPublicBlogs(BLOG_ID, slugs);

    const { where } = findMany.mock.calls[0]?.[0] as {
      where: { tags: { some: { tag: { slug: { in: string[] } } } } };
    };
    expect(where.tags.some.tag.slug.in).toEqual(
      slugs.slice(0, MAX_FILTER_SLUGS)
    );
  });

  it.each([
    ['a Prisma filter object for the id', { not: '' }, ['react'], 3],
    ['an id of the wrong shape', 'not-a-cuid', ['react'], 3],
    ['tags that are not strings', BLOG_ID, [{ contains: '' }], 3],
    ['an oversized slug', BLOG_ID, ['x'.repeat(5_000)], 3],
    ['a non-numeric limit', BLOG_ID, ['react'], '3'],
  ])('refuses %s without querying', async (_label, blogId, tagSlugs, limit) => {
    const res = await getRelatedPublicBlogs(
      blogId as unknown as string,
      tagSlugs as unknown as string[],
      limit as unknown as number
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
  });
});
