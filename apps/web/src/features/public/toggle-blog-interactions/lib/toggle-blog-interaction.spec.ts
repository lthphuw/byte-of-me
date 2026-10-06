/**
 * Any signed-in visitor can call this, so the revalidated tag must come from
 * the blog row, never the caller; unpublished blogs are refused, and so is a
 * throttled caller. `revalidateTag` is spied on the preload's `next/cache` stub.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import * as nextCache from 'next/cache';

import { toggleBlogInteraction } from './toggle-blog-interaction';

import { INTERACTION } from '@/shared/lib/constants';

const blogFindUnique = mock();
const interactionFindUnique = mock();
const interactionCreate = mock();
const interactionDelete = mock();
const upsert = mock();
const deleteMany = mock();

Object.defineProperty(prisma, 'blog', {
  value: { findUnique: blogFindUnique },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'interaction', {
  value: {
    findUnique: interactionFindUnique,
    create: interactionCreate,
    delete: interactionDelete,
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'rateLimitHit', {
  value: { upsert, deleteMany },
  writable: true,
  configurable: true,
});

const revalidateTag = spyOn(nextCache, 'revalidateTag');

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('toggleBlogInteraction', () => {
  beforeEach(() => {
    blogFindUnique
      .mockReset()
      .mockResolvedValue({ slug: 'real-slug', isPublished: true });
    interactionFindUnique.mockReset().mockResolvedValue(null);
    interactionCreate.mockReset().mockResolvedValue({});
    interactionDelete.mockReset().mockResolvedValue({});
    upsert.mockReset().mockResolvedValue({ count: 2 });
    deleteMany.mockReset().mockResolvedValue({ count: 0 });
    revalidateTag.mockClear();
  });

  it("purges the blog row's own tag, not the slug the caller sent", async () => {
    const res = await toggleBlogInteraction(
      BLOG_ID,
      'project',
      INTERACTION.LIKE
    );

    expect(res).toEqual({ success: true, data: null });
    expect(interactionCreate).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('real-slug', 'max');
  });

  it('removes an existing interaction instead of adding a second', async () => {
    interactionFindUnique.mockResolvedValue({ id: 'interaction-1' });

    await toggleBlogInteraction(BLOG_ID, 'ignored', INTERACTION.CLAP);

    expect(interactionDelete).toHaveBeenCalledWith({
      where: { id: 'interaction-1' },
    });
    expect(interactionCreate).not.toHaveBeenCalled();
  });

  it('refuses an unpublished blog without writing or purging', async () => {
    blogFindUnique.mockResolvedValue({ slug: 'draft', isPublished: false });

    const res = await toggleBlogInteraction(BLOG_ID, 'draft', INTERACTION.LIKE);

    expect(res.success).toBe(false);
    expect(interactionCreate).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses a blog that does not exist', async () => {
    blogFindUnique.mockResolvedValue(null);

    const res = await toggleBlogInteraction(BLOG_ID, 'gone', INTERACTION.LIKE);

    expect(res.success).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses a non-string blog id before any query', async () => {
    const res = await toggleBlogInteraction(
      { not: '' } as unknown as string,
      'x',
      INTERACTION.LIKE
    );

    expect(res.success).toBe(false);
    expect(blogFindUnique).not.toHaveBeenCalled();
  });

  it('refuses a throttled caller before any query', async () => {
    upsert.mockResolvedValue({ count: 21 });

    const res = await toggleBlogInteraction(BLOG_ID, 'x', INTERACTION.LIKE);

    expect(res.success).toBe(false);
    expect(blogFindUnique).not.toHaveBeenCalled();
    expect(interactionCreate).not.toHaveBeenCalled();
  });
});
