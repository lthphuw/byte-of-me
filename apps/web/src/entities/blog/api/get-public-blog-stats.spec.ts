/**
 * `blogId` comes from an anonymous caller; only a plain id may reach Prisma.
 * `{ not: '' }` would read as a filter, so it is refused with no query run.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPublicBlogStats } from './get-public-blog-stats';

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
