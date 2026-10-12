'use client';

import { reorderFeaturedWork } from '@/entities/featured-work/api/reorder-featured-work';
import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

/**
 * Swaps an entry with its neighbour, then refetches every page of the admin
 * list: a move across a page boundary changes two pages at once.
 */
export function useReorderFeaturedWork(errorMessage: string) {
  const mutation = useServerMutation({
    mutationFn: (input: { id: string; direction: 'up' | 'down' }) =>
      reorderFeaturedWork(input.id, input.direction),
    errorMessage,
    invalidate: [featuredWorkKeys.adminList()],
  });

  return {
    move: (id: string, direction: 'up' | 'down') =>
      mutation.mutate({ id, direction }),
    isMoving: mutation.isPending,
  };
}
