'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminProjectById } from '@/entities/project/api/get-admin-project-by-id';
import { projectQueries } from '@/entities/project/query/project-queries';

/** The full project for the edit dialog. `null` means "new": nothing is fetched. */
export function useAdminProjectById(id: string | null) {
  return useEditingRecord({
    id,
    queryKey: (projectId) => projectQueries.adminById(projectId).queryKey,
    fetchRecord: getAdminProjectById,
  });
}
