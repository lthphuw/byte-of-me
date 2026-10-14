/**
 * The slug becomes a cache key and tag, so a value that is not a plain slug is
 * answered as a missing post before anything is cached or read.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPublicBlogBySlug } from './get-public-blog-by-slug';


const findUniqueOrThrow = mock();
Object.defineProperty(prisma, 'blog', {
  value: { findUniqueOrThrow },
  writable: true,
  configurable: true,
});

describe('getPublicBlogBySlug', () => {
  beforeEach(() => {
    findUniqueOrThrow.mockReset().mockRejectedValue(new Error('not found'));
  });

  it.each([
    ['an empty slug', ''],
    ['an oversized slug', 'a'.repeat(201)],
    ['a Prisma filter object', { not: '' }],
    ['a missing slug', undefined],
  ])('refuses %s without querying', async (_label, slug) => {
    const res = await getPublicBlogBySlug(slug as unknown as string);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('still looks up a title-derived slug longer than the filter-chip bound', async () => {
    await getPublicBlogBySlug('a'.repeat(100));

    expect(findUniqueOrThrow).toHaveBeenCalledTimes(1);
  });

  it('reads only published posts and the public media columns', async () => {
    await getPublicBlogBySlug('hello-world');

    const arg = findUniqueOrThrow.mock.calls[0]?.[0] as {
      where: unknown;
      include: { coverImage: unknown };
    };
    expect(arg.where).toEqual({ slug: 'hello-world', isPublished: true });
    expect(arg.include.coverImage).toEqual({
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mimeType: true,
      },
    });
  });
});
