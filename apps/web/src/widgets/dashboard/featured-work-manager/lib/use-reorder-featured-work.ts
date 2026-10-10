'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { reorderFeaturedWork } from '@/entities/featured-work/api/reorder-featured-work';
import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

/**
 * Swaps an entry with its neighbour, then refetches every page of the admin
 * list: a move across a page boundary changes two pages at once.
 */
export function useReorderFeaturedWork(errorMessage: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string; direction: 'up' | 'down' }) =>
      unwrapApiResponse(await reorderFeaturedWork(input.id, input.direction)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: featuredWorkKeys.adminList() }),
    onError: () => toast.error(errorMessage),
  });

  return {
    move: (id: string, direction: 'up' | 'down') =>
      mutation.mutate({ id, direction }),
    isMoving: mutation.isPending,
  };
}
