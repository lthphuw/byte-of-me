'use client';

import { getAdminFeaturedWorkById } from '@/entities/featured-work/api/get-admin-featured-work-by-id';
import { featuredWorkQueries } from '@/entities/featured-work/query/featured-work-queries';
import { useEditingRecord } from '@/shared/hooks/use-editing-record';

/** The full row for the edit dialog. `undefined` means "new": nothing is fetched. */
export function useAdminFeaturedWorkById(id: string | undefined) {
  return useEditingRecord({
    id: id ?? null,
    queryKey: (workId) => featuredWorkQueries.adminById(workId).queryKey,
    fetchRecord: getAdminFeaturedWorkById,
  });
}
