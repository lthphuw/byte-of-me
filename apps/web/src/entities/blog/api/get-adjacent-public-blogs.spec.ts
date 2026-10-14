/**
 * `currentId` and `publishedDate` end up in a cache key, so both are checked
 * before anything is read. The date also arrives as a string when the caller
 * got it from a cached read, and that form must still work.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getAdjacentPublicBlogs } from './get-adjacent-public-blogs';

const findFirst = mock();
Object.defineProperty(prisma, 'blog', {
  value: { findFirst },
  writable: true,
  configurable: true,
});

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('getAdjacentPublicBlogs', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
  });

  it('reads both neighbours around a Date', async () => {
    const res = await getAdjacentPublicBlogs(new Date('2026-01-01'), BLOG_ID);

    expect(res).toEqual({ success: true, data: { next: null, prev: null } });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('accepts the ISO string a cached read hands back', async () => {
    const res = await getAdjacentPublicBlogs(
      '2026-01-01T00:00:00.000Z',
      BLOG_ID
    );

    expect(res.success).toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publishedDate: { gt: new Date('2026-01-01T00:00:00.000Z') },
        }),
      })
    );
  });

  it('answers a post with no date without querying', async () => {
    const res = await getAdjacentPublicBlogs(null, BLOG_ID);

    expect(res).toEqual({ success: true, data: { next: null, prev: null } });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['an id of the wrong shape', new Date(), 'not-a-cuid'],
    ['a Prisma filter object for the id', new Date(), { not: '' }],
    ['an oversized id', new Date(), `c${'a'.repeat(5_000)}`],
    ['a date that does not parse', 'tomorrow-ish', BLOG_ID],
  ])('refuses %s without querying', async (_label, date, id) => {
    const res = await getAdjacentPublicBlogs(
      date as unknown as Date,
      id as unknown as string
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
