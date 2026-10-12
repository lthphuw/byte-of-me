import { queryOptions } from '@tanstack/react-query';

import { getPaginatedAdminComments } from '@/entities/comment/api/get-paginated-admin-comments';
import { getPaginatedPublicCommentsForBlog } from '@/entities/comment/api/get-paginated-public-comments-for-blog';
import { commentKeys } from '@/entities/comment/model/query-keys';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

/**
 * Query options for every comment read. The thread is paged, so it returns the
 * `key` and `fetchPage` pair that `useInfiniteListQuery` takes, and that hook
 * unwraps the envelope. The admin page is a plain query.
 */
export const commentQueries = {
  threadInfinite: (blogId: string, limit: number) => ({
    queryKey: commentKeys.thread(blogId, limit),
    fetchPage: (page: number) =>
      getPaginatedPublicCommentsForBlog({ page, limit, blogId }),
  }),

  adminPage: (page: number) =>
    queryOptions({
      queryKey: commentKeys.adminList(page),
      queryFn: async () =>
        unwrapApiResponse(await getPaginatedAdminComments(page, ADMIN_PAGE_SIZE)),
    }),
};
