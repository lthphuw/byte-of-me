'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminTagById } from '@/entities/tag/api/get-admin-tag-by-id';
import { tagQueries } from '@/entities/tag/query/tag-queries';

/** The full tag for the edit dialog. `null` means "new": nothing is fetched. */
export function useAdminTagById(id: string | null) {
  return useEditingRecord({
    id,
    queryKey: (tagId) => tagQueries.adminById(tagId).queryKey,
    fetchRecord: getAdminTagById,
  });
}
