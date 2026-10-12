'use client';

import { useQuery } from '@tanstack/react-query';

import { commentQueries } from '@/entities/comment/query/comment-queries';

/** One page of the admin comment list. The previous page stays up while the next loads. */
export function useAdminComments(page: number) {
  return useQuery({
    ...commentQueries.adminPage(page),
    placeholderData: (previousData) => previousData,
  });
}
