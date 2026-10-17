'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminTechStackById } from '@/entities/tech-stack/api/get-admin-tech-stack-by-id';
import { techStackQueries } from '@/entities/tech-stack/query/tech-stack-queries';

/** The full tech stack item for the edit dialog. `null` means "new": nothing is fetched. */
export function useAdminTechStackById(id: string | null) {
  return useEditingRecord({
    id,
    queryKey: (techStackId) => techStackQueries.adminById(techStackId).queryKey,
    fetchRecord: getAdminTechStackById,
  });
}
