import type { INTERACTION } from '@byte-of-me/api-core';
import { unwrapApiResponse } from '@byte-of-me/api-core';
import { blogKeys } from '@byte-of-me/contracts/blog';
import { queryOptions } from '@tanstack/react-query';

import { getAdminBlogById } from '@/entities/blog/api/get-admin-blog-by-id';
import { getBlogInteractionsForUser } from '@/entities/blog/api/get-blog-interactions-for-user';
import { getPaginatedAdminBlogs } from '@/entities/blog/api/get-paginated-admin-blogs';
import { getPaginatedPublicBlogs } from '@/entities/blog/api/get-paginated-public-blogs';
import { getPublicBlogStats } from '@/entities/blog/api/get-public-blog-stats';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';

export type BlogListFilters = { tagSlugs: string[]; search: string };

/**
 * Not in the key: fixed inside the factory, so prefetch and client share it.
 */
const PUBLIC_LIST_LIMIT = 6;
/** Live view and reading-time counts are cheap to hold for a few minutes. */
const STATS_STALE_TIME = 1000 * 60 * 5;

/**
 * Query options for every blog read. The server prefetch and the client hook
 * both take their options from here, so the key and the query function cannot
 * drift apart. `queryFn` unwraps the envelope, so a refused read throws.
 */
export const blogQueries = {
  publicList: (
    page: number,
    filters: BlogListFilters,
    includeDrafts = false
  ) =>
    queryOptions({
      queryKey: includeDrafts
        ? blogKeys.publicListWithDrafts(page, filters)
        : blogKeys.publicList(page, filters),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedPublicBlogs({
            ...filters,
            page,
            limit: PUBLIC_LIST_LIMIT,
            includeDrafts,
          })
        ),
    }),

  adminPage: (page: number) =>
    queryOptions({
      queryKey: blogKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(await getPaginatedAdminBlogs(page, ADMIN_PAGE_SIZE)),
    }),

  adminById: (blogId: string) =>
    queryOptions({
      queryKey: blogKeys.detail(blogId),
      queryFn: async () =>
        unwrapApiResponse(await getAdminBlogById(blogId)),
    }),

  stats: (blogId: string) =>
    queryOptions({
      queryKey: blogKeys.stats(blogId),
      queryFn: async () => unwrapApiResponse(await getPublicBlogStats(blogId)),
      staleTime: STATS_STALE_TIME,
    }),

  interaction: (blogId: string, kind: INTERACTION) =>
    queryOptions({
      queryKey: blogKeys.interaction(blogId, kind),
      queryFn: async () =>
        unwrapApiResponse(await getBlogInteractionsForUser(blogId, kind)),
    }),
};
