'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminEducationById } from '@/entities/education/api/get-admin-education-by-id';
import { educationQueries } from '@/entities/education/query/education-queries';

/** The full entry for the edit dialog. `undefined` means "new": nothing is fetched. */
export function useAdminEducationById(id: string | undefined) {
  return useEditingRecord({
    id: id ?? null,
    queryKey: (educationId) => educationQueries.adminById(educationId).queryKey,
    fetchRecord: getAdminEducationById,
  });
}
