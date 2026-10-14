/**
 * `blogId` comes from an anonymous caller; only a plain id may reach Prisma.
 * `{ not: '' }` would read as a filter, so it is refused with no query run.
 * Only a published blog has stats: the median scan never runs for a draft.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPublicBlogStats } from './get-public-blog-stats';

const blogFindFirst = mock();
const logCount = mock();
const interactionCount = mock();
const queryRaw = mock();
Object.defineProperty(prisma, 'blogStatisticLog', {
  value: { count: logCount },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'interaction', {
  value: { count: interactionCount },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('getPublicBlogStats', () => {
  beforeEach(() => {
    Object.defineProperty(prisma, 'blog', {
      value: { findFirst: blogFindFirst },
      writable: true,
      configurable: true,
    });
    blogFindFirst.mockReset().mockResolvedValue({ id: BLOG_ID });
    logCount.mockReset().mockResolvedValue(7);
    interactionCount.mockReset().mockResolvedValue(2);
    queryRaw.mockReset().mockResolvedValue([{ medianTime: 120 }]);
  });

  it('returns the stats for a well-formed id', async () => {
    const res = await getPublicBlogStats(BLOG_ID);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toEqual({
      views: 7,
      avgTime: 2,
      rawSeconds: 120,
      totalLikes: 2,
    });
    expect(logCount).toHaveBeenCalledWith({ where: { blogId: BLOG_ID } });
  });

  it('refuses a draft or unknown blog without running the aggregates', async () => {
    blogFindFirst.mockResolvedValue(null);

    const res = await getPublicBlogStats(BLOG_ID);

    expect(res).toEqual({ success: false, errorMsg: 'Blog not found' });
    expect(blogFindFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: BLOG_ID, isPublished: true },
    });
    expect(queryRaw).not.toHaveBeenCalled();
    expect(logCount).not.toHaveBeenCalled();
  });

  it('answers a database failure with a fixed message', async () => {
    queryRaw.mockRejectedValue(
      new Error('connect ECONNREFUSED db.internal:5432')
    );

    const res = await getPublicBlogStats(BLOG_ID);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).not.toContain('db.internal');
  });

  it.each([
    ['a Prisma filter object', { not: '' }],
    ['an empty string', ''],
    ['an id of the wrong shape', 'not-a-cuid'],
    ['an oversized string', 'c'.repeat(10_000)],
    ['a number', 42],
  ])('refuses %s without querying', async (_label, blogId) => {
    const res = await getPublicBlogStats(blogId as unknown as string);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(logCount).not.toHaveBeenCalled();
    expect(interactionCount).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
