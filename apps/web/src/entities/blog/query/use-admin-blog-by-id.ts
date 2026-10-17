'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminBlogById } from '@/entities/blog/api/get-admin-blog-by-id';
import { blogQueries } from '@/entities/blog/query/blog-queries';

/**
 * The full post for the editor dialog. Mount the form only once `record` is
 * set (`isNotReady` covers loading, failed and idle): the list row carries no
 * body, so saving from it would overwrite the post with an empty one.
 */
export function useAdminBlogById(id: string | undefined) {
  return useEditingRecord({
    id: id ?? null,
    queryKey: (blogId) => blogQueries.adminById(blogId).queryKey,
    fetchRecord: getAdminBlogById,
  });
}
