/**
 * `blogId` must be a plain id: `{ not: '' }` would read as a Prisma filter and
 * return every blog's comments, drafts included. Refused with no query run.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPaginatedPublicCommentsForBlog } from './get-paginated-public-comments-for-blog';

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'comment', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('getPaginatedPublicCommentsForBlog', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
  });

  it('scopes the query to the one blog it was asked for', async () => {
    const res = await getPaginatedPublicCommentsForBlog({ blogId: BLOG_ID });

    expect(res.success).toBe(true);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { blogId: BLOG_ID, parentId: null, isDeleted: false },
      })
    );
  });

  it('caps replies per level and stops at the per-page ceiling', async () => {
    const row = (id: string, parentId: string | null) => ({
      id,
      createdAt: new Date(),
      content: 'hi',
      blogId: BLOG_ID,
      parentId,
      userId: 'u1',
      user: { name: 'A' },
    });
    const level = (prefix: string, n: number, parentId: string) =>
      Array.from({ length: n }, (_, i) => row(`${prefix}${i}`, parentId));
    count.mockResolvedValue(1);
    findMany
      .mockResolvedValueOnce([row('root', null)])
      .mockResolvedValueOnce(level('a', 250, 'root'))
      .mockResolvedValueOnce(level('b', 100, 'a0'))
      .mockResolvedValueOnce(level('c', 150, 'b0'));

    const res = await getPaginatedPublicCommentsForBlog({ blogId: BLOG_ID });

    expect(res.success).toBe(true);
    const takes = findMany.mock.calls.map(
      ([arg]) => (arg as { take?: number }).take
    );
    // roots (limit 8), then 250 per level, then what is left of the 500.
    expect(takes).toEqual([8, 250, 250, 150]);
    // 250 + 100 + 150 = 500: the ceiling is reached, so no fifth query runs.
    expect(findMany).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['a Prisma filter object', { not: '' }],
    ['an array', [BLOG_ID]],
    ['an empty string', ''],
    ['an id of the wrong shape', 'not-a-cuid'],
  ])('refuses %s without querying', async (_label, blogId) => {
    const res = await getPaginatedPublicCommentsForBlog({
      blogId: blogId as unknown as string,
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
