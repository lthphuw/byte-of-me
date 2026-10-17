'use client';

import type { PublicProjectFilters } from '@byte-of-me/contracts/project';
import { useQuery } from '@tanstack/react-query';

import { projectQueries } from '@/entities/project/query/project-queries';
import { HYDRATED_LIST_BEHAVIOR } from '@/shared/hooks/use-infinite-list-query';

/**
 * One page of the public timeline. The previous page stays on screen while the
 * next one loads (`isPlaceholderData`); the hydrated first page never refetches.
 */
export function usePublicProjectList(
  page: number,
  filters: PublicProjectFilters
) {
  return useQuery({
    ...projectQueries.publicList(page, filters),
    placeholderData: (previousData) => previousData,
    ...HYDRATED_LIST_BEHAVIOR,
  });
}
