/**
 * `getPaginatedPublicBlogs` is a `'use server'` action reached only through
 * Next.js's server runtime in production (locale resolution, the
 * incremental cache, `server-only`'s bundler alias — see
 * `apps/web/next-runtime-stubs.ts` for why each needs a stand-in under
 * `bun test`). None of that is what this spec defends. What it defends is
 * the action's own contract: the envelope shape callers rely on, that
 * caller-controlled pagination is bounded before it reaches Prisma (see
 * `clampPagination` in `@/shared/lib/pagination`, already unit-tested on its
 * own), and that an anonymous caller only ever sees published posts.
 *
 * Prisma is not spied on: Prisma 7 synthesizes a fresh function per method
 * access (`prisma.blog.findMany !== prisma.blog.findMany`), so
 * `spyOn(prisma.blog, 'findMany')` patches a value the client never reads
 * back. The whole `blog` delegate is replaced instead, mirroring
 * `apps/web/src/shared/lib/rate-limit.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetPaginatedPublicBlogsModule from './get-paginated-public-blogs';

// `env.ts` (reached transitively through this action) validates eagerly at
// import time against `typeof window`, and `happydom.ts` (an earlier
// preload, needed by *.spec.tsx files) has already registered a global
// `window` by the time this file's imports run. Left in place, that makes
// the env module treat this test process as a browser and refuse every
// server-only key it holds (`onInvalidAccess`) the moment the action reads
// one. This spec never renders anything, so the DOM global is dropped
// before the action is imported — a per-file effect only: `bun test`
// gives every spec file its own globals, confirmed by having one file set
// `globalThis` state and a second file observe it unset.
let getPaginatedPublicBlogs: typeof GetPaginatedPublicBlogsModule.getPaginatedPublicBlogs;

beforeAll(async () => {
  await GlobalRegistrator.unregister();
  ({ getPaginatedPublicBlogs } = await import('./get-paginated-public-blogs'));
});

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'blog', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const blogRow = {
  id: 'blog-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  slug: 'hello-world',
  isPublished: true,
  publishedDate: new Date('2026-01-03T00:00:00.000Z'),
  translations: [{ language: 'en', title: 'Hello', description: 'World' }],
  project: null,
  coverImage: null,
  readingTime: 5,
  tags: [],
  _count: { blogViewLogs: 3 },
};

describe('getPaginatedPublicBlogs', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([blogRow]);
    count.mockReset().mockResolvedValue(1);
  });

  it('returns a success envelope shaped as PaginatedData', async () => {
    const res = await getPaginatedPublicBlogs({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.data).toHaveLength(1);
    expect(res.data.data[0]?.slug).toBe('hello-world');
    expect(res.data.meta).toEqual({
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      hasMore: false,
    });
  });

  it('reports failure through errorMsg, never error, when the query rejects', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getPaginatedPublicBlogs({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toContain('connection refused');
    expect((res as { error?: unknown }).error).toBeUndefined();
  });

  it('clamps out-of-range pagination before it reaches Prisma', async () => {
    // clampPagination's own bounds (defaultLimit 9, maxLimit 50) are tested
    // in pagination.spec.ts; this only checks the action actually applies
    // them before querying, using an out-of-range page and an oversized
    // limit together.
    await getPaginatedPublicBlogs({ page: 0, limit: 1_000_000 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it('scopes an anonymous caller to published posts only', async () => {
    await getPaginatedPublicBlogs({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } })
    );
    expect(count).toHaveBeenCalledWith({ where: { isPublished: true } });
  });
});
