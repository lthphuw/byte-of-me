'use client';

import { featuredWorkKeys } from '@byte-of-me/contracts/featured-work';
import { useServerMutation } from '@byte-of-me/query';

import { reorderFeaturedWork } from '@/entities/featured-work/api/reorder-featured-work';

/**
 * Swaps an entry with its neighbour, then invalidates the entity's root key, so
 * every page of the admin list refetches: a move across a page boundary changes
 * two pages at once. Reports a move like any other update.
 */
export function useReorderFeaturedWork(messages: {
  updated: string;
  saveError: string;
}) {
  const mutation = useServerMutation({
    mutationFn: (input: { id: string; direction: 'up' | 'down' }) =>
      reorderFeaturedWork(input.id, input.direction),
    successMessage: messages.updated,
    errorMessage: messages.saveError,
    invalidate: [featuredWorkKeys.all],
  });

  return {
    move: (id: string, direction: 'up' | 'down') =>
      mutation.mutate({ id, direction }),
    isMoving: mutation.isPending,
  };
}
